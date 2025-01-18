const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function sendMessageStream(history, userInput) {
  try {
    const chat = model.startChat({ history });

    const response = await chat.sendMessageStream(userInput);

    return response.stream;
  } catch (error) {
    console.error(
      "Error in sendMessageStream:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

module.exports = { sendMessageStream };
