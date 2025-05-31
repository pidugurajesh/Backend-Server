const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },

  postedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  acceptedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  completedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  earnings: [{
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    amount: Number,
    date: Date
  }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
