const express = require("express");
const router = express.Router();
const { sendMessageStream } = require("../services/gemini");

/**
 * Send user input and history to Gemini server
 */
router.post("/", async (req, res) => {
  try {
    const { input, history } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input is required" });
    }

    const chatHistories = history || [];

    chatHistories.map((chatHistory) => {
      console.log(`${chatHistory.role}: ${chatHistory.parts[0].text}`);
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await sendMessageStream(chatHistories, input);

    for await (const chunk of stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();
  } catch (error) {
    console.error("Error in chatbot route:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;
