// services/twilioService.js
const twilio = require('twilio');
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID);
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN);


// Twilio credentials from the .env file
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory store for OTPs
const otpStore = new Map();

// Function to send OTPs
const sendOtpService = async (phoneNumber) => {
  try {
    // Format phone number to E.164 if missing country code (assuming +91 for India)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+91' + phoneNumber;
    }

    const otp = Math.floor(100000 + Math.random() * 900000);  // Generate a 6-digit OTP
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,  // Twilio phone number (make sure this is correct)
      to: phoneNumber,  // Phone number to which OTP will be sent
    });

    // Store OTP with expiration (e.g., 5 minutes)
    otpStore.set(phoneNumber, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { success: false, message: "Failed to send OTP", error: error.message || error.toString() };
  }
};


// Function to verify OTPs
const verifyOtpService = async (phoneNumber, code) => {
  try {
    // Format phone number to E.164 if missing country code (assuming +91 for India)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+91' + phoneNumber;
    }

    const record = otpStore.get(phoneNumber);
    if (!record) {
      return { success: false, message: "OTP not found or expired" };
    }
    if (record.expiresAt < Date.now()) {
      otpStore.delete(phoneNumber);
      return  { success: false, message: "OTP expired" };
    }
    if (record.otp.toString() === code.toString()) {
      otpStore.delete(phoneNumber);
      return { success: true, message: "OTP verified successfully" };
    } else {
      return { success: false, message: "Invalid OTP" };
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, message: "Failed to verify OTP", error: error.message || error.toString() };
  }
};

module.exports = { sendOtpService, verifyOtpService };
