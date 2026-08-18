const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, uppercase: true, trim: true },
  courseName: { type: String, required: true, trim: true },
  department: { type: String },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lecturerName: { type: String },
  substituteLecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  enrollmentCode: { type: String, unique: true, default: () => nanoid(8).toUpperCase() },
  attendanceThreshold: { type: Number, default: 75 }, // custom per course
  // Recurring schedule
  schedule: [{
    day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] },
    startTime: String, // "10:00"
    endTime: String,   // "10:30"
    windowMinutes: { type: Number, default: 30 },
  }],
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
