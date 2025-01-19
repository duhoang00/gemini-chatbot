const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require("@google/generative-ai");

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const generationConfig = {
  candidateCount: 1,
  maxOutputTokens: 200,
  temperature: 0.8,
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  safetySettings: safetySettings,
  generationConfig: generationConfig,
  systemInstruction:
    "You are a helpful assistant. Respond to queries in a friendly, concise, and informative tone. Provide your responses progressively, one meaningful chunk at a time, to improve clarity for users. If a query has multiple steps or parts, answer them in sequence.",
});

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
