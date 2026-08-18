const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Policy = require("../models/Policy");
const { sendOTP, sendPasswordReset } = require("../utils/mailer");
const { createNotification } = require("../utils/notify");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Try again in 15 minutes." },
});

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role, matricNumber, staffId, department } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (role === "student" && !matricNumber)
      return res.status(400).json({ message: "Matric number required" });
    if (role === "lecturer" && !staffId)
      return res.status(400).json({ message: "Staff ID required" });
    if (role === "admin")
      return res.status(400).json({ message: "Admin accounts are created by the system" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Lecturers need admin approval, students auto-approve after OTP
    const isApproved = role === "student";

    const user = await User.create({
      name, email, password, role,
      matricNumber, staffId, department,
      otp, otpExpiry,
      isVerified: false,
      isApproved,
    });

    await sendOTP(email, name, otp);

    res.status(201).json({
      message: "Account created. Check your email for the verification code.",
      userId: user._id,
      requiresVerification: true,
      requiresApproval: role === "lecturer",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify OTP
router.post("/verify-otp", authLimiter, async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });
    // DEV ONLY: universal bypass code so you can test without email set up.
    // Remove this block (or set DEV_SKIP_OTP=false in .env) before going live.
    const devBypass = process.env.DEV_SKIP_OTP !== "false" && otp === "000000";
    if (!devBypass) {
      if (user.otp !== otp) return res.status(400).json({ message: "Invalid code" });
      if (new Date() > user.otpExpiry) return res.status(400).json({ message: "Code expired. Request a new one." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    if (user.role === "lecturer") {
      return res.json({
        message: "Email verified. Your account is pending admin approval.",
        pendingApproval: true,
      });
    }

    await createNotification(user._id, "success", "Welcome to AttendEase! 🎉", "Your account is verified. Enroll in your first course to get started.");
    res.json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resend OTP
router.post("/resend-otp", authLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Already verified" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTP(user.email, user.name, otp);

    res.json({ message: "New code sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (role && user.role !== role)
      return res.status(401).json({ message: `This account is not a ${role} account` });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Please verify your email first", userId: user._id, requiresVerification: true });
    if (user.role === "lecturer" && !user.isApproved)
      return res.status(403).json({ message: "Your account is pending admin approval", pendingApproval: true });

    res.json({ token: sign(user._id), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "If this email exists, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendPasswordReset(email, user.name, token);

    res.json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
