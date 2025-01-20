const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, default: "Default Thread" },
  messages: [
    {
      role: { type: String, required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Thread", threadSchema);
