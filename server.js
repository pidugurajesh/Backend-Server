require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const twilio = require("twilio");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

const User = require("./models/User");
const Job = require("./models/job");
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
connectDB();

// OTP in-memory store
const otpStore = new Map();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ========== OTP Services ==========

// Send OTP
const sendOtpService = async (phoneNumber) => {
  try {
    const fullPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : '+91' + phoneNumber;
    const otp = Math.floor(100000 + Math.random() * 900000);

    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: fullPhoneNumber,
    });

    otpStore.set(fullPhoneNumber, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`✅ OTP ${otp} sent to ${fullPhoneNumber}`);

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return { success: false, message: "Failed to send OTP", error: error.message };
  }
};

// Verify OTP
const verifyOtpService = async (phoneNumber, code) => {
  try {
    const record = otpStore.get(phoneNumber);

    if (!record) return { success: false, message: "OTP not found or expired" };
    if (record.expiresAt < Date.now()) {
      otpStore.delete(phoneNumber);
      return { success: false, message: "OTP expired" };
    }
    if (record.otp.toString() === code.toString()) {
      otpStore.delete(phoneNumber);
      return { success: true, message: "OTP verified successfully" };
    } else {
      return { success: false, message: "Invalid OTP" };
    }
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return { success: false, message: "Failed to verify OTP", error: error.message };
  }
};

// ========== Routes ==========

// Send OTP
app.post("/api/otp/send", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ success: false, message: "Phone number is required" });

  const result = await sendOtpService(phoneNumber);
  res.json(result);
});

// Verify OTP
app.post("/api/otp/verify", async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) return res.status(400).json({ success: false, message: "Phone number and OTP code are required" });

  const fullPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : '+91' + phoneNumber;
  const result = await verifyOtpService(fullPhoneNumber, code);
  res.json(result);
});

// Register
app.post('/api/register', async (req, res) => {
  const { email, username, password, phoneNumber } = req.body;

  if (!email || !username || !password || !phoneNumber)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  try {
    const userExists = await User.findOne({
      $or: [{ email }, { username }, { phoneNumber }]
    });

    if (userExists)
      return res.status(409).json({ success: false, message: 'User already exists' });

    const newUser = new User({ email, username, password, phoneNumber });
    await newUser.save();

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate entry detected' });
    }
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Please provide both email and password" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ Post a Job (no Firebase)
app.post('/api/jobs', async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job
    });
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
