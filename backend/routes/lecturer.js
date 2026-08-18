const router = require("express").Router();
const auth = require("../middleware/auth");
const Course = require("../models/Course");
const Session = require("../models/Session");
const User = require("../models/User");
const Excuse = require("../models/Excuse");
const { generateQRDataURL } = require("../utils/qr");
const { createNotification } = require("../utils/notify");
const { sendAtRiskAlert } = require("../utils/mailer");

const lecturerOnly = (req, res, next) => {
  if (!["lecturer","admin"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

// Dashboard
router.get("/dashboard", auth, lecturerOnly, async (req, res) => {
  try {
    const courses = await Course.find({ lecturer: req.user._id });
    const allSessions = await Session.find({ lecturer: req.user._id, status: "ended" });
    let totalPresent = 0, totalPossible = 0;
    for (const s of allSessions) {
      totalPresent += s.attendees.filter(a => a.status !== "absent").length;
      const course = courses.find(c => String(c._id) === String(s.course));
      totalPossible += course?.students.length || 0;
    }
    const totalStudents = [...new Set(courses.flatMap(c => c.students.map(String)))].length;
    const pendingExcuses = await Excuse.countDocuments({ course: { $in: courses.map(c => c._id) }, status: "pending" });

    // Trend data
    const recentSessions = await Session.find({ lecturer: req.user._id, status: "ended" }).sort({ createdAt: -1 }).limit(8);
    const trend = recentSessions.reverse().map(s => {
      const course = courses.find(c => String(c._id) === String(s.course));
      const total = course?.students.length || 1;
      return { date: new Date(s.windowStart).toLocaleDateString("en-US",{month:"short",day:"numeric"}), rate: Math.round((s.attendees.length / total) * 100), courseCode: s.courseCode };
    });

    res.json({
      courses: courses.map(c => ({ _id: c._id, courseCode: c.courseCode, courseName: c.courseName, enrollmentCode: c.enrollmentCode, studentCount: c.students.length, threshold: c.attendanceThreshold || 75 })),
      stats: { totalStudents, totalSessions: allSessions.length, avgAttendance: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0, pendingExcuses },
      trend,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create course
router.post("/courses", auth, lecturerOnly, async (req, res) => {
  try {
    const { courseCode, courseName, department, attendanceThreshold, schedule } = req.body;
    const course = await Course.create({
      courseCode: courseCode.toUpperCase(), courseName, department,
      lecturer: req.user._id, lecturerName: req.user.name,
      attendanceThreshold: attendanceThreshold || 75,
      schedule: schedule || [],
    });
    await createNotification(req.user._id, "success", "Course created ✅",
      `${course.courseCode} — ${course.courseName} was created successfully.`,
      { courseId: course._id });
    res.status(201).json({ course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/courses", auth, lecturerOnly, async (req, res) => {
  try {
    const courses = await Course.find({ lecturer: req.user._id });
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update course (threshold, schedule, substitute)
router.put("/course/:courseId", auth, lecturerOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Not found" });
    const { attendanceThreshold, schedule, substituteLecturer } = req.body;
    if (attendanceThreshold) course.attendanceThreshold = attendanceThreshold;
    if (schedule) course.schedule = schedule;
    if (substituteLecturer !== undefined) course.substituteLecturer = substituteLecturer || null;
    await course.save();
    res.json({ course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Course detail
router.get("/course/:courseId", auth, lecturerOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate("students", "name email matricNumber");
    if (!course) return res.status(404).json({ message: "Not found" });
    const activeSession = await Session.findOne({ course: course._id, status: "active" });
    res.json({ course: { _id: course._id, courseCode: course.courseCode, courseName: course.courseName, enrollmentCode: course.enrollmentCode, studentCount: course.students.length, threshold: course.attendanceThreshold || 75, schedule: course.schedule }, students: course.students, activeSession });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start session
router.post("/session/start", auth, lecturerOnly, async (req, res) => {
  try {
    const { courseId, windowMinutes = 30, locationLat, locationLon } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await Session.updateMany({ course: courseId, status: "active" }, { status: "ended" });
    const now = new Date();
    const session = await Session.create({
      course: courseId, courseCode: course.courseCode, courseName: course.courseName,
      lecturer: req.user._id, lecturerName: req.user.name,
      windowStart: now, windowEnd: new Date(now.getTime() + windowMinutes * 60 * 1000),
      locationLat, locationLon,
    });

    // Notify enrolled students
    for (const studentId of course.students) {
      await createNotification(studentId, "reminder", `${course.courseCode} check-in is open 📋`,
        `Attendance window is now open. You have ${windowMinutes} minutes to mark your attendance.`,
        { courseId, sessionId: session._id });
    }

    // Notify the lecturer that their session is live
    await createNotification(req.user._id, "success", "Session started ✅",
      `${course.courseCode} attendance window is now open for ${windowMinutes} minutes.`,
      { courseId, sessionId: session._id });

    const qrUrl = await generateQRDataURL(session.qrToken, session._id);
    res.status(201).json({ session, qrUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// QR for lecturer
router.get("/session/:sessionId/qr", auth, lecturerOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    const age = Date.now() - new Date(session.qrRefreshedAt).getTime();
    if (age > 32000) { session.refreshQR(); await session.save(); }
    const qrUrl = await generateQRDataURL(session.qrToken, session._id);
    res.json({ qrUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Live attendees
router.get("/session/:sessionId/attendees", auth, lecturerOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    res.json({ attendees: session.attendees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual override
router.put("/session/:sessionId/override", auth, lecturerOnly, async (req, res) => {
  try {
    const { studentId, status } = req.body;
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const existing = session.attendees.find(a => String(a.studentId) === String(studentId));
    if (existing) {
      existing.status = status;
      existing.manuallyOverridden = true;
      existing.overriddenBy = req.user._id;
    } else {
      session.attendees.push({ studentId, studentName: student.name, matricNumber: student.matricNumber, status, method: "manual", manuallyOverridden: true, overriddenBy: req.user._id });
    }
    await session.save();

    await createNotification(studentId, "system", "Attendance Updated",
      `Your attendance for ${session.courseCode} was updated to "${status}" by ${req.user.name}.`);

    res.json({ message: "Override applied" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk mark
router.put("/session/:sessionId/bulk-mark", auth, lecturerOnly, async (req, res) => {
  try {
    const { status } = req.body; // "present" | "absent"
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    const course = await Course.findById(session.course).populate("students", "name matricNumber");

    for (const student of course.students) {
      const existing = session.attendees.find(a => String(a.studentId) === String(student._id));
      if (existing) { existing.status = status; existing.manuallyOverridden = true; }
      else {
        session.attendees.push({ studentId: student._id, studentName: student.name, matricNumber: student.matricNumber, status, method: "manual", manuallyOverridden: true });
      }
    }
    await session.save();
    res.json({ message: `All students marked as ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// End session
router.post("/session/:sessionId/end", auth, lecturerOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    session.status = "ended";
    await session.save();

    // Check for at-risk students and notify
    const course = await Course.findById(session.course).populate("students", "name email matricNumber");
    const threshold = course.attendanceThreshold || 75;
    for (const student of course.students) {
      const sessions = await Session.find({ course: course._id, status: "ended" });
      const attended = sessions.filter(s => s.attendees.some(a => String(a.studentId) === String(student._id))).length;
      const rate = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 0;
      if (rate < threshold && sessions.length >= 3) {
        await sendAtRiskAlert(student.email, student.name, course.courseCode, rate);
      }
    }

    res.json({ message: "Session ended" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Session history
router.get("/sessions", auth, lecturerOnly, async (req, res) => {
  try {
    const query = { lecturer: req.user._id, status: "ended" };
    if (req.query.course) query.course = req.query.course;
    const sessions = await Session.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export session CSV
router.get("/session/:sessionId/export", auth, lecturerOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Not found" });
    const course = await Course.findById(session.course).populate("students", "name matricNumber");
    const markedIds = new Set(session.attendees.map(a => String(a.studentId)));
    let csv = "Name,Matric Number,Status,Method,Time\n";
    for (const a of session.attendees) {
      csv += `"${a.studentName}","${a.matricNumber}","${a.status}","${a.method}","${new Date(a.checkedInAt).toLocaleString()}"\n`;
    }
    for (const s of course.students) {
      if (!markedIds.has(String(s._id))) csv += `"${s.name}","${s.matricNumber}","absent","—","—"\n`;
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance-${session.courseCode}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Course report
router.get("/course/:courseId/report", auth, lecturerOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate("students", "name matricNumber email");
    if (!course) return res.status(404).json({ message: "Not found" });
    const sessions = await Session.find({ course: course._id, status: "ended" }).sort({ createdAt: 1 });
    const students = course.students.map(s => {
      const history = sessions.map(sess => {
        const a = sess.attendees.find(a => String(a.studentId) === String(s._id));
        return a ? a.status : "absent";
      });
      const present = history.filter(h => h !== "absent").length;
      return { _id: s._id, name: s.name, matricNumber: s.matricNumber, email: s.email, history, attendanceRate: sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0 };
    });
    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Course export CSV
router.get("/course/:courseId/export", auth, lecturerOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate("students", "name matricNumber");
    const sessions = await Session.find({ course: course._id, status: "ended" }).sort({ createdAt: 1 });
    let csv = `Name,Matric Number,${sessions.map((_,i) => `Session ${i+1}`).join(",")},Attendance Rate\n`;
    for (const s of course.students) {
      const row = sessions.map(sess => { const a = sess.attendees.find(a => String(a.studentId) === String(s._id)); return a ? a.status : "absent"; });
      const rate = sessions.length > 0 ? Math.round((row.filter(r => r !== "absent").length / sessions.length) * 100) : 0;
      csv += `"${s.name}","${s.matricNumber}",${row.map(r=>`"${r}"`).join(",")},${rate}%\n`;
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=report-${course.courseCode}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All students across courses
router.get("/students", auth, lecturerOnly, async (req, res) => {
  try {
    const courses = await Course.find({ lecturer: req.user._id }).populate("students", "name email matricNumber");
    const studentMap = {};
    for (const c of courses) {
      for (const s of c.students) {
        if (!studentMap[s._id]) studentMap[s._id] = { ...s.toObject(), courses: [] };
        studentMap[s._id].courses.push(c.courseCode);
      }
    }
    res.json({ students: Object.values(studentMap) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
