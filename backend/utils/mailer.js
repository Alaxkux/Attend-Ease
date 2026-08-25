const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function sendOTP(email, name, otp) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"AttendEase" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Verify your AttendEase account",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f0f0f8;border-radius:16px;">
          <h2 style="color:#22c55e;margin-bottom:8px;">AttendEase</h2>
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <div style="font-size:2.5rem;font-weight:800;letter-spacing:0.2em;color:#22c55e;background:#16161f;padding:20px;border-radius:12px;text-align:center;margin:20px 0;">${otp}</div>
          <p style="color:#8888aa;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
  } catch (err) {
    // Never let an email-send failure fail account creation — the account
    // already exists at this point. Log it and fall back to console OTP.
    console.error("sendOTP failed, falling back to console log:", err.message);
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }
}

async function sendPasswordReset(email, name, token) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log(`[DEV] Reset URL for ${email}: ${resetUrl}`);
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"AttendEase" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Reset your AttendEase password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f0f0f8;border-radius:16px;">
          <h2 style="color:#22c55e;">Reset Password</h2>
          <p>Hi ${name}, click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 28px;border-radius:99px;text-decoration:none;font-weight:700;margin:16px 0;">Reset Password</a>
          <p style="color:#8888aa;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendPasswordReset failed, falling back to console log:", err.message);
    console.log(`[DEV] Reset URL for ${email}: ${resetUrl}`);
  }
}

async function sendAtRiskAlert(email, name, courseCode, attendanceRate) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log(`[DEV] At-risk alert for ${email}: ${courseCode} at ${attendanceRate}%`);
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"AttendEase" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `⚠️ Attendance Warning — ${courseCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#f0f0f8;border-radius:16px;">
          <h2 style="color:#f59e0b;">⚠️ Attendance Warning</h2>
          <p>Hi ${name},</p>
          <p>Your attendance for <strong>${courseCode}</strong> has dropped to <strong style="color:#ef4444;">${attendanceRate}%</strong>.</p>
          <p>The minimum required is 75%. Please attend upcoming sessions to avoid being barred from exams.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendAtRiskAlert failed:", err.message);
  }
}

module.exports = { sendOTP, sendPasswordReset, sendAtRiskAlert };