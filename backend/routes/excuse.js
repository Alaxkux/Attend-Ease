const router = require("express").Router();
const auth = require("../middleware/auth");
const Excuse = require("../models/Excuse");
const Session = require("../models/Session");
const Course = require("../models/Course");
const { createNotification } = require("../utils/notify");

// Student: submit excuse
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Forbidden" });
    const { sessionId, reason, evidence } = req.body;
    if (!sessionId || !reason) return res.status(400).json({ message: "Session and reason required" });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const existing = await Excuse.findOne({ student: req.user._id, session: sessionId });
    if (existing) return res.status(400).json({ message: "Excuse already submitted for this session" });

    const excuse = await Excuse.create({
      student: req.user._id,
      studentName: req.user.name,
      matricNumber: req.user.matricNumber,
      session: sessionId,
      course: session.course,
      courseCode: session.courseCode,
      reason,
      evidence,
    });

    // Notify lecturer
    await createNotification(
      session.lecturer, "excuse",
      `Excuse Request — ${session.courseCode}`,
      `${req.user.name} submitted an excuse for the ${new Date(session.windowStart).toLocaleDateString()} session.`,
      { excuseId: excuse._id }
    );

    res.status(201).json({ excuse });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student: get my excuses
router.get("/my", auth, async (req, res) => {
  try {
    const excuses = await Excuse.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json({ excuses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lecturer: get excuses for their courses
router.get("/course/:courseId", auth, async (req, res) => {
  try {
    const excuses = await Excuse.find({ course: req.params.courseId }).sort({ createdAt: -1 });
    res.json({ excuses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lecturer/Admin: review excuse
router.put("/:id/review", auth, async (req, res) => {
  try {
    if (!["lecturer", "admin"].includes(req.user.role))
      return res.status(403).json({ message: "Forbidden" });

    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Status must be approved or rejected" });

    const excuse = await Excuse.findById(req.params.id);
    if (!excuse) return res.status(404).json({ message: "Excuse not found" });

    excuse.status = status;
    excuse.reviewNote = reviewNote;
    excuse.reviewedBy = req.user._id;
    excuse.reviewedAt = new Date();
    await excuse.save();

    // If approved, update session attendee status to excused
    if (status === "approved") {
      const session = await Session.findById(excuse.session);
      if (session) {
        const attendee = session.attendees.find(a => String(a.studentId) === String(excuse.student));
        if (attendee) {
          attendee.status = "excused";
        } else {
          session.attendees.push({
            studentId: excuse.student,
            studentName: excuse.studentName,
            matricNumber: excuse.matricNumber,
            status: "excused",
            method: "manual",
          });
        }
        await session.save();
      }
    }

    // Notify student
    await createNotification(
      excuse.student,
      status === "approved" ? "success" : "system",
      `Excuse ${status === "approved" ? "Approved ✅" : "Rejected ❌"}`,
      `Your excuse for ${excuse.courseCode} has been ${status}.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
    );

    res.json({ excuse });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
