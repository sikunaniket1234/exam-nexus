const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log("Checking available models...");
    // This specific model is the most stable free one
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent("Test connection. Reply with 'OK'.");
    console.log("✅ Success! Connected to model: gemini-1.5-flash");
    console.log("Response:", result.response.text());
  } catch (error) {
    console.error("❌ Error connecting to Gemini:", error.message);
    if (error.message.includes("404")) {
        console.log("👉 Try changing the model name to 'gemini-pro' in your code.");
    }
  }
}

listModels();