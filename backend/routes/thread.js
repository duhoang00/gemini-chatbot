const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Thread = require("../models/thread");

/**
 * Get a thread detail
 */
router.get("/:id", async (req, res) => {
  const threadId = req.params.id;

  try {
    let thread = await Thread.findOne({ _id: threadId });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    return res.json({ thread });
  } catch (error) {
    console.error("Error getting thread:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Create a thread
 */
router.post("/", async (req, res) => {
  const { userId, threadName } = req.body;

  try {
    let user = await User.findOne({ userId }).populate("threads");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const thread = await Thread.create({
      userId: user.userId,
      name: threadName || "Default Thread",
    });

    user.threads.push(thread._id);
    await user.save();

    return res.json({ thread });
  } catch (error) {
    console.error("Error creating thread:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Save a message to a thread
 */
router.post("/message", async (req, res) => {
  const { threadId, role, text } = req.body;

  try {
    const thread = await Thread.findByIdAndUpdate(
      threadId,
      {
        $push: { messages: { role, text, timestamp: new Date() } },
      },
      { new: true },
    );

    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    return res.json({ success: true, thread });
  } catch (error) {
    console.error("Error saving message:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
