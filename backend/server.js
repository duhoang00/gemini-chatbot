require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./services/db");
const chatbotRoutes = require("./routes/chatbot");
const threadRoutes = require("./routes/thread");
const userRoutes = require("./routes/user");

const PORT = process.env.PORT || 8000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatbotRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
