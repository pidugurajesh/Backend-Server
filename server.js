// server.js
require("dotenv").config();
console.log("Loaded environment variables:", process.env);
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

// Models & DB
const User = require("./models/User");
const Job = require("./models/job");  // Fixed import to match filename "job.js"
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Helper function to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// In-memory OTP Store
const otpStore = new Map();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ========== OTP Services ==========
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

const verifyOtpService = async (phoneNumber, code) => {
  try {
    const fullPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : '+91' + phoneNumber;
    const record = otpStore.get(fullPhoneNumber);
    if (!record) return { success: false, message: "OTP not found or expired" };

    if (record.expiresAt < Date.now()) {
      otpStore.delete(fullPhoneNumber);
      return { success: false, message: "OTP expired" };
    }

    if (record.otp.toString() === code.toString()) {
      otpStore.delete(fullPhoneNumber);
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
  if (!phoneNumber || !code)
    return res.status(400).json({ success: false, message: "Phone number and OTP code are required" });

  const result = await verifyOtpService(phoneNumber, code);
  res.json(result);
});

// Register
app.post('/api/register', async (req, res) => {
  const { email, username, password, phoneNumber } = req.body;

  if (!email || !username || !password || !phoneNumber)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }, { phoneNumber }] });
    if (userExists)
      return res.status(409).json({ success: false, message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, username, password: hashedPassword, phoneNumber });
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

    // ✅ Return username as "name" for frontend
    return res.status(200).json({
      message: "Login successful",
      userId: user._id,
      name: user.username // <-- Include this in response
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});


// Post a Job
app.post('/api/jobs', async (req, res) => {
  const { postedBy, _id } = req.body;

  if (!postedBy)
    return res.status(400).json({ success: false, message: 'postedBy field is required' });

  if (!isValidObjectId(postedBy))
    return res.status(400).json({ success: false, message: 'Invalid postedBy user ID format' });

  // Delete empty _id if present
  if (_id === "") {
    delete req.body._id;
  }

  try {
    const user = await User.findById(postedBy);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const job = new Job(req.body);
    await job.save();

    user.postedJobs.push(job._id);
    await user.save();

    res.status(201).json({ success: true, message: 'Job posted successfully', job });
  } catch (error) {
    console.error("Error posting job:", error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Updated: Get all jobs with poster's username (and phone number if needed)
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('postedBy', 'username phoneNumber'); // Adjust fields as required

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept Job
app.post('/api/job/accept', async (req, res) => {
  const { userId, jobId } = req.body;

  if (!userId || !jobId)
    return res.status(400).json({ success: false, message: 'User ID and Job ID are required' });

  if (!isValidObjectId(userId) || !isValidObjectId(jobId)) {
    return res.status(400).json({ success: false, message: 'Invalid User ID or Job ID format' });
  }

  try {
    const user = await User.findById(userId);
    const job = await Job.findById(jobId);

    if (!user || !job)
      return res.status(404).json({ success: false, message: 'User or Job not found' });

    if (!user.acceptedJobs.includes(jobId)) {
      user.acceptedJobs.push(jobId);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Job accepted successfully', acceptedJobs: user.acceptedJobs });
  } catch (error) {
    console.error('Error accepting job:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Complete Job
app.post('/api/job/complete', async (req, res) => {
  const { userId, jobId, amount } = req.body;

  if (!userId || !jobId || !amount)
    return res.status(400).json({ success: false, message: 'All fields required' });

  if (!isValidObjectId(userId) || !isValidObjectId(jobId)) {
    return res.status(400).json({ success: false, message: 'Invalid User ID or Job ID format' });
  }

  try {
    const user = await User.findById(userId);
    const job = await Job.findById(jobId);

    if (!user || !job)
      return res.status(404).json({ success: false, message: 'User or Job not found' });

    // Remove the job from acceptedJobs list
    user.acceptedJobs = user.acceptedJobs.filter(id => id.toString() !== jobId);
    // Add to completedJobs list if not already present
    if (!user.completedJobs.includes(jobId)) user.completedJobs.push(jobId);

    // Record earnings
    user.earnings.push({
      jobId: job._id,
      amount,
      date: new Date()
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Job marked as completed',
      completedJobs: user.completedJobs,
      earnings: user.earnings
    });
  } catch (error) {
    console.error('Error completing job:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user-specific data
app.get('/api/user/:email/data', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email })
      .populate('postedJobs')
      .populate('acceptedJobs')
      .populate('completedJobs')
      .populate('earnings.jobId');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        postedJobs: user.postedJobs,
        acceptedJobs: user.acceptedJobs,
        completedJobs: user.completedJobs,
        earnings: user.earnings.map(e => ({
          jobTitle: e.jobId?.title,
          amount: e.amount,
          date: e.date
        }))
      }
    });
  } catch (error) {
    console.error('Error loading user data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
