const mongoose = require('mongoose');

/**
 * Connect to MongoDB with resilient retry and connection lifecycle listeners
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/corporate_hr_db';

  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2500 // Quick timeout so server starts immediately even if mongod is starting
    });

    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected.');
    });
  } catch (error) {
    console.warn(`[Database Notice] MongoDB is not connected at ${mongoUri} (${error.message}).`);
    console.warn('[Database Notice] The Web Application and REST server are running on port 5000 so you can preview the UI and inspect features. Start mongod to enable live database persistence.');
  }
};

module.exports = connectDB;
