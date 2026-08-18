const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");
const Session = require("../models/Session");
const { generateCertificateHTML } = require("../utils/pdf");
const Policy = require("../models/Policy");

// Get profile
router.get("/", auth, async (req, res) => {
  try {
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put("/", auth, async (req, res) => {
  try {
    const { name, phone, department, bio, avatarImage } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (bio !== undefined) user.bio = bio.slice(0, 200);
    if (avatarImage) {
      // Guard against oversized payloads (~2MB base64 cap)
      if (avatarImage.length > 2_800_000) {
        return res.status(400).json({ message: "Image too large. Please choose a smaller photo." });
      }
      user.avatarImage = avatarImage;
    }
    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id);
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark onboarding seen
router.post("/onboarding-done", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { hasSeenOnboarding: true });
    res.json({ message: "ok" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete account
router.delete("/", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Attendance certificate (student only)
router.get("/certificate", auth, async (req, res) => {
  try {
    if (req.user.role !== "student")
      return res.status(403).json({ message: "Only students can download certificates" });

    const courses = await Course.find({ students: req.user._id });
    const policy = await Policy.findOne() || { institutionName: "AttendEase University", semester: "2025/2026" };

    const courseData = await Promise.all(courses.map(async (c) => {
      const sessions = await Session.find({ course: c._id, status: "ended" });
      const attended = sessions.filter(s =>
        s.attendees.some(a => String(a.studentId) === String(req.user._id))
      ).length;
      const rate = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 0;
      return { courseCode: c.courseCode, courseName: c.courseName, totalSessions: sessions.length, attended, rate };
    }));

    const html = generateCertificateHTML(req.user, courseData, policy.institutionName, policy.semester);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
