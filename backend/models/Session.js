const mongoose = require("mongoose");
const crypto = require("crypto");

const attendeeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  studentName: String,
  matricNumber: String,
  status: { type: String, enum: ["present", "late", "absent", "excused"], default: "present" },
  method: { type: String, enum: ["qr", "location", "manual"], default: "qr" },
  checkedInAt: { type: Date, default: Date.now },
  manuallyOverridden: { type: Boolean, default: false },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  courseCode: String,
  courseName: String,
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lecturerName: String,
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  locationLat: Number,
  locationLon: Number,
  geofenceRadius: { type: Number, default: 50 },
  qrToken: { type: String, default: () => crypto.randomBytes(16).toString("hex") },
  qrRefreshedAt: { type: Date, default: Date.now },
  attendees: [attendeeSchema],
  status: { type: String, enum: ["active", "ended"], default: "active" },
  isRecurring: { type: Boolean, default: false },
  recurringDay: String,
}, { timestamps: true });

sessionSchema.methods.refreshQR = function () {
  this.qrToken = require("crypto").randomBytes(16).toString("hex");
  this.qrRefreshedAt = new Date();
};

module.exports = mongoose.model("Session", sessionSchema);
