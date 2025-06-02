const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('../models/job');

const cleanJobs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const result = await Job.deleteMany({ _id: null });
    console.log(`Deleted ${result.deletedCount} jobs with null _id`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error cleaning jobs:', error);
    process.exit(1);
  }
};

cleanJobs();
