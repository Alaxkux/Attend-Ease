const router = require("express").Router();
const auth = require("../middleware/auth");
const Course = require("../models/Course");
const Session = require("../models/Session");
const User = require("../models/User");
const Excuse = require("../models/Excuse");
const { generateQRDataURL } = require("../utils/qr");
const { createNotification } = require("../utils/notify");
const Anthropic = require("@anthropic-ai/sdk");
const { haversineDistance } = require("../utils/geo");

const QR_TTL = 32 * 1000;

// Dashboard
router.get("/dashboard", auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id });
    const now = new Date();

    const todaysCourses = await Promise.all(courses.map(async (c) => {
      const session = await Session.findOne({
        course: c._id, status: "active",
        windowStart: { $lte: new Date(now.getTime() + 60 * 60 * 1000) },
        windowEnd: { $gte: new Date(now.getTime() - 30 * 60 * 1000) },
      });
      let status = "upcoming", alreadyMarked = false;
      if (session) {
        alreadyMarked = session.attendees.some(a => String(a.studentId) === String(req.user._id));
        if (alreadyMarked) status = "marked";
        else if (now >= new Date(session.windowStart) && now <= new Date(session.windowEnd)) status = "in-progress";
        else if (now > new Date(session.windowEnd)) status = "ended";
      }
      return {
        _id: c._id, courseCode: c.courseCode, courseName: c.courseName,
        startTime: session ? formatTime(session.windowStart) : "—",
        endTime: session ? formatTime(session.windowEnd) : "—",
        status, sessionId: session?._id,
      };
    }));

    const allSessions = await Session.find({ course: { $in: courses.map(c => c._id) }, status: "ended" });
    let present = 0, total = 0, history = [], streak = 0;
    for (const s of allSessions.sort((a, b) => a.createdAt - b.createdAt)) {
      total++;
      const marked = s.attendees.find(a => String(a.studentId) === String(req.user._id));
      history.push(marked ? marked.status : "absent");
      if (marked) present++;
    }
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] !== "absent") streak++;
      else break;
    }
    const overallAttendance = total > 0 ? Math.round((present / total) * 100) : 0;
    const atRisk = total >= 4 && overallAttendance < 75;

    if (atRisk) {
      const existing = await require("../models/Notification").findOne({
        user: req.user._id, type: "risk",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (!existing) {
        await createNotification(req.user._id, "risk", "Attendance at Risk ⚠️",
          `Your overall attendance is ${overallAttendance}%. Stay above 75% to avoid being barred from exams.`);
      }
    }

    res.json({
      todaysCourses,
      stats: { overallAttendance, streak, atRisk, classesAttended: present, totalClasses: total },
      hasSeenOnboarding: req.user.hasSeenOnboarding,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get session for attend page
router.get("/session/:courseId", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!course.students.map(String).includes(String(req.user._id)))
      return res.status(403).json({ message: "Not enrolled in this course" });
    const session = await Session.findOne({ course: course._id, status: "active" }).sort({ createdAt: -1 });
    if (!session) return res.status(404).json({ message: "No active session" });
    const alreadyMarked = session.attendees.some(a => String(a.studentId) === String(req.user._id));
    res.json({
      session: {
        _id: session._id, courseCode: course.courseCode, courseName: course.courseName,
        lecturer: course.lecturerName, windowStart: session.windowStart, windowEnd: session.windowEnd,
        locationLat: session.locationLat, locationLon: session.locationLon, geofenceRadius: session.geofenceRadius,
      },
      alreadyMarked,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// QR for student
router.get("/session/:courseId/qr", auth, async (req, res) => {
  try {
    const session = await Session.findOne({ course: req.params.courseId, status: "active" });
    if (!session) return res.status(404).json({ message: "No active session" });
    const age = Date.now() - new Date(session.qrRefreshedAt).getTime();
    if (age > QR_TTL) { session.refreshQR(); await session.save(); }
    const qrUrl = await generateQRDataURL(session.qrToken, session._id);
    res.json({ qrUrl, token: session.qrToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check in
router.post("/checkin/:courseId", auth, async (req, res) => {
  try {
    const { method, lat, lon } = req.body;
    const session = await Session.findOne({ course: req.params.courseId, status: "active" });
    if (!session) return res.status(400).json({ message: "No active session" });
    const now = new Date();
    if (now < new Date(session.windowStart)) return res.status(400).json({ message: "Check-in window not open yet" });
    if (now > new Date(session.windowEnd)) return res.status(400).json({ message: "Check-in window has closed" });
    if (session.attendees.some(a => String(a.studentId) === String(req.user._id)))
      return res.status(400).json({ message: "Attendance already marked" });

    if (method === "location") {
      if (!session.locationLat || !session.locationLon)
        return res.status(400).json({ message: "Location check-in not available" });
      const dist = haversineDistance(lat, lon, session.locationLat, session.locationLon);
      if (dist > (session.geofenceRadius || 50))
        return res.status(400).json({ message: `You are ${Math.round(dist)}m from the classroom` });
    }

    const tenMinsIn = new Date(session.windowStart.getTime() + 10 * 60 * 1000);
    const status = now > tenMinsIn ? "late" : "present";
    session.attendees.push({ studentId: req.user._id, studentName: req.user.name, matricNumber: req.user.matricNumber, status, method });
    await session.save();

    await createNotification(req.user._id, "success", "Attendance Marked ✅",
      `You've been marked ${status} for ${session.courseCode}.`);

    res.json({ message: "Attendance marked", status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Enroll
router.post("/enroll", auth, async (req, res) => {
  try {
    const { code } = req.body;
    const course = await Course.findOne({ enrollmentCode: code.toUpperCase() });
    if (!course) return res.status(404).json({ message: "Invalid enrollment code" });
    if (course.students.map(String).includes(String(req.user._id)))
      return res.status(400).json({ message: "Already enrolled" });
    course.students.push(req.user._id);
    await course.save();
    await createNotification(req.user._id, "success", `Enrolled in ${course.courseCode}`,
      `You've successfully joined ${course.courseName}.`);
    res.json({ message: "Enrolled successfully", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unenroll
router.delete("/enroll/:courseId", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    course.students = course.students.filter(s => String(s) !== String(req.user._id));
    await course.save();
    res.json({ message: "Unenrolled successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// My courses
router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id });
    const enriched = await Promise.all(courses.map(async (c) => {
      const sessions = await Session.find({ course: c._id, status: "ended" });
      const present = sessions.filter(s => s.attendees.some(a => String(a.studentId) === String(req.user._id))).length;
      const attendanceRate = sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0;
      return { _id: c._id, courseCode: c.courseCode, courseName: c.courseName, lecturer: c.lecturerName, attendanceRate, threshold: c.attendanceThreshold || 75 };
    }));
    res.json({ courses: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Schedule / timetable
router.get("/schedule", auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id });
    const schedule = courses.flatMap(c =>
      (c.schedule || []).map(s => ({
        courseCode: c.courseCode, courseName: c.courseName,
        day: s.day, startTime: s.startTime, endTime: s.endTime,
        lecturer: c.lecturerName,
      }))
    );
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Attendance history
router.get("/history", auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id });
    const allSessions = await Session.find({ course: { $in: courses.map(c => c._id) }, status: "ended" }).sort({ createdAt: -1 });
    const sessions = allSessions.map(s => {
      const a = s.attendees.find(a => String(a.studentId) === String(req.user._id));
      const course = courses.find(c => String(c._id) === String(s.course));
      return {
        sessionId: s._id, courseId: s.course,
        courseCode: course?.courseCode || s.courseCode,
        courseName: course?.courseName || s.courseName,
        date: s.windowStart,
        time: `${formatTime(s.windowStart)} – ${formatTime(s.windowEnd)}`,
        status: a ? a.status : "absent",
        method: a?.method || null,
        canExcuse: !a && new Date() < new Date(s.windowEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    });
    res.json({ sessions, courses: courses.map(c => ({ _id: c._id, courseCode: c.courseCode })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Insights
router.get("/insights", auth, async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id });
    const allSessions = await Session.find({ course: { $in: courses.map(c => c._id) }, status: "ended" }).sort({ createdAt: 1 });
    let allHistory = [];
    const heatmap = { Mon:{day:"Mon",present:0,late:0,absent:0},Tue:{day:"Tue",present:0,late:0,absent:0},Wed:{day:"Wed",present:0,late:0,absent:0},Thu:{day:"Thu",present:0,late:0,absent:0},Fri:{day:"Fri",present:0,late:0,absent:0} };
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (const s of allSessions) {
      const marked = s.attendees.find(a => String(a.studentId) === String(req.user._id));
      const h = marked ? marked.status : "absent";
      allHistory.push(h);
      const day = days[new Date(s.windowStart).getDay()];
      if (heatmap[day]) heatmap[day][h]++;
    }
    const courseData = await Promise.all(courses.map(async (c) => {
      const sessions = await Session.find({ course: c._id, status: "ended" });
      let hist = [], present = 0;
      for (const s of sessions) {
        const m = s.attendees.find(a => String(a.studentId) === String(req.user._id));
        hist.push(m ? m.status : "absent");
        if (m) present++;
      }
      return { courseCode: c.courseCode, courseName: c.courseName, attendanceRate: sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0, history: hist, threshold: c.attendanceThreshold || 75 };
    }));
    res.json({ allHistory, heatmap: Object.values(heatmap), courses: courseData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// AI insight
router.post("/ai-insight", auth, async (req, res) => {
  try {
    const { history, courseName } = req.body;
    const client = new Anthropic();
    const total = history.length;
    if (total === 0) return res.json({ insight: "No attendance data yet. Start attending classes to see your AI-powered analysis." });
    const present = history.filter(h => h === "present").length;
    const late = history.filter(h => h === "late").length;
    const absent = history.filter(h => h === "absent").length;
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 200,
      messages: [{ role: "user", content: `University student attendance for ${courseName || "their courses"}: Total: ${total}, Present: ${present} (${Math.round(present/total*100)}%), Late: ${late} (${Math.round(late/total*100)}%), Absent: ${absent} (${Math.round(absent/total*100)}%), Recent pattern (last 10): ${history.slice(-10).join(", ")}. Write a single personalized 2-3 sentence insight. Be honest but encouraging. Flag if below 75%. No bullets or headers.` }],
    });
    res.json({ insight: message.content[0]?.text || "Unable to generate insight." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

module.exports = router;
