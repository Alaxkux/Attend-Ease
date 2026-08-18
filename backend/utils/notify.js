const Notification = require("../models/Notification");

async function createNotification(userId, type, title, body, meta = {}) {
  try {
    await Notification.create({ user: userId, type, title, body, meta });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
}

module.exports = { createNotification };
