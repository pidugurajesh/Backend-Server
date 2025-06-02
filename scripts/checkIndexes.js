const mongoose = require('mongoose');
require('dotenv').config();

const checkIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const indexes = await db.collection('jobs').indexes();
    console.log('Indexes on jobs collection:', indexes);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error checking indexes:', error);
    process.exit(1);
  }
};

checkIndexes();
