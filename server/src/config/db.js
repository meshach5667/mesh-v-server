const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  mongoose.set('strictQuery', true);
  return mongoose.connect(env.mongoUrl, {
    dbName: env.dbName,
  });
};

module.exports = { connectDatabase };
