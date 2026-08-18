const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["student", "lecturer", "admin"], required: true },
  matricNumber: { type: String, trim: true },
  staffId: { type: String, trim: true },
  avatar: { type: String }, // initials color
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  pushToken: { type: String },
  // Email verification
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  // Lecturer approval
  isApproved: { type: Boolean, default: false },
  // Password reset
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // Onboarding
  hasSeenOnboarding: { type: Boolean, default: false },
  // Profile
  phone: { type: String },
  department: { type: String },
  bio: { type: String, maxlength: 200 },
  avatarImage: { type: String }, // base64 data URI of uploaded profile picture
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
