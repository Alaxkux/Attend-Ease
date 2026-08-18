const mongoose = require("mongoose");

const excuseSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentName: String,
  matricNumber: String,
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  courseCode: String,
  reason: { type: String, required: true },
  evidence: { type: String }, // URL or description
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewNote: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Excuse", excuseSchema);
