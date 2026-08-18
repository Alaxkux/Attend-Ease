require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "4mb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/student", require("./routes/student"));
app.use("/api/lecturer", require("./routes/lecturer"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/excuse", require("./routes/excuse"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (_, res) => res.json({ status: "ok", time: new Date() }));

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => { console.log("✅ MongoDB connected"); app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)); })
  .catch(err => { console.error("❌ MongoDB connection failed:", err.message); process.exit(1); });
