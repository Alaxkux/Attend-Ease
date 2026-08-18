const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");
const Session = require("../models/Session");
const Excuse = require("../models/Excuse");
const Policy = require("../models/Policy");
const { createNotification } = require("../utils/notify");
const { sendAtRiskAlert } = require("../utils/mailer");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
};

// Dashboard stats
router.get("/dashboard", auth, adminOnly, async (req, res) => {
  try {
    const [totalStudents, totalLecturers, totalCourses, totalSessions, pendingLecturers, pendingExcuses] = await Promise.all([
      User.countDocuments({ role: "student", isVerified: true }),
      User.countDocuments({ role: "lecturer", isApproved: true }),
      Course.countDocuments(),
      Session.countDocuments({ status: "ended" }),
      User.countDocuments({ role: "lecturer", isVerified: true, isApproved: false }),
      Excuse.countDocuments({ status: "pending" }),
    ]);

    // Attendance trend (last 7 sessions)
    const recentSessions = await Session.find({ status: "ended" }).sort({ createdAt: -1 }).limit(7);
    const trend = recentSessions.reverse().map(s => ({
      date: new Date(s.windowStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate: s.attendees.length,
      courseCode: s.courseCode,
    }));

    res.json({ stats: { totalStudents, totalLecturers, totalCourses, totalSessions, pendingLecturers, pendingExcuses }, trend });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all lecturers (pending + approved)
router.get("/lecturers", auth, adminOnly, async (req, res) => {
  try {
    const lecturers = await User.find({ role: "lecturer" }).select("-password").sort({ createdAt: -1 });
    res.json({ lecturers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/reject lecturer
router.put("/lecturers/:id/approve", auth, adminOnly, async (req, res) => {
  try {
    const { approved, note } = req.body;
    const lecturer = await User.findById(req.params.id);
    if (!lecturer) return res.status(404).json({ message: "Lecturer not found" });

    lecturer.isApproved = approved;
    await lecturer.save();

    await createNotification(
      lecturer._id,
      approved ? "success" : "system",
      approved ? "Account Approved ✅" : "Account Rejected",
      approved
        ? "Your lecturer account has been approved. You can now log in and create courses."
        : `Your account was not approved.${note ? ` Reason: ${note}` : ""}`,
    );

    res.json({ message: `Lecturer ${approved ? "approved" : "rejected"}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all students
router.get("/students", auth, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all courses
router.get("/courses", auth, adminOnly, async (req, res) => {
  try {
    const courses = await Course.find().populate("lecturer", "name email").sort({ createdAt: -1 });
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get/update policy
router.get("/policy", auth, adminOnly, async (req, res) => {
  try {
    let policy = await Policy.findOne();
    if (!policy) policy = await Policy.create({});
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/policy", auth, adminOnly, async (req, res) => {
  try {
    let policy = await Policy.findOne();
    if (!policy) policy = new Policy();
    Object.assign(policy, req.body);
    await policy.save();
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send at-risk alerts manually
router.post("/send-risk-alerts", auth, adminOnly, async (req, res) => {
  try {
    const policy = await Policy.findOne() || { globalThreshold: 75 };
    const students = await User.find({ role: "student", isVerified: true });
    let alerted = 0;

    for (const student of students) {
      const courses = await Course.find({ students: student._id });
      for (const course of courses) {
        const sessions = await Session.find({ course: course._id, status: "ended" });
        if (sessions.length < 3) continue;
        const attended = sessions.filter(s => s.attendees.some(a => String(a.studentId) === String(student._id))).length;
        const rate = Math.round((attended / sessions.length) * 100);
        const threshold = course.attendanceThreshold || policy.globalThreshold;
        if (rate < threshold) {
          await sendAtRiskAlert(student.email, student.name, course.courseCode, rate);
          await createNotification(student._id, "risk", "Attendance Warning ⚠️",
            `Your attendance in ${course.courseCode} is ${rate}%, below the ${threshold}% threshold.`);
          alerted++;
        }
      }
    }
    res.json({ message: `Sent ${alerted} alert(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete("/users/:id", auth, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
