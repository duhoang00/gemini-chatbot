const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB!");
  })
  .catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err.message);
  });

module.exports = mongoose;
