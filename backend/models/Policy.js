const mongoose = require("mongoose");

// Single global policy document
const policySchema = new mongoose.Schema({
  globalThreshold: { type: Number, default: 75 },
  allowLocationCheckin: { type: Boolean, default: true },
  allowQRCheckin: { type: Boolean, default: true },
  lateWindowMinutes: { type: Number, default: 10 },
  maxExcusesPerSemester: { type: Number, default: 3 },
  requireLecturerApproval: { type: Boolean, default: true },
  institutionName: { type: String, default: "AttendEase University" },
  semester: { type: String, default: "2025/2026 First Semester" },
}, { timestamps: true });

module.exports = mongoose.model("Policy", policySchema);
