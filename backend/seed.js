require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existing = await User.findOne({ role: "admin" });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${existing.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: "Super Admin",
      email: process.env.ADMIN_EMAIL || "admin@attendease.app",
      password: process.env.ADMIN_PASSWORD || "Admin@1234",
      role: "admin",
      isVerified: true,
      isApproved: true,
      hasSeenOnboarding: true,
    });

    console.log("✅ Admin account created:");
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || "Admin@1234"}`);
    console.log("\n⚠️  Change this password immediately after first login.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
