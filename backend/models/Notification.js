const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["checkin", "risk", "success", "reminder", "excuse", "approval", "system"], default: "system" },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  meta: { type: Object }, // extra data e.g. courseId, sessionId
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
