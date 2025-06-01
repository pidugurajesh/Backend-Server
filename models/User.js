const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  amount: Number,
  date: Date
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  postedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  acceptedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  completedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  earnings: [earningSchema]
});

module.exports = mongoose.model('User', userSchema);
