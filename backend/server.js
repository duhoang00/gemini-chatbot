require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatbotRoutes = require("./routes/chatbot");

const PORT = process.env.PORT || 8000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatbotRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
