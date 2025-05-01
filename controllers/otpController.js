// controllers/otpController.js
const { sendOtpService, verifyOtpService } = require("../services/twilioService");

const sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const response = await sendOtpService(phoneNumber);
        res.json(response);
    } catch (error) {
        console.error("Error in sendOtp:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

const verifyOtp = async (req, res) => {
    const { phone, code } = req.body;
    try {
        const result = await verifyOtpService(phone, code);
        res.json(result);
    } catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({ success: false, message: "Failed to verify OTP" });
    }
};

module.exports = { sendOtp, verifyOtp };
