// src/utils/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to convert file buffer to Gemini-friendly format
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

exports.generateQuestions = async (textInput, fileBuffer, mimeType, count = 5, difficulty = 'Medium') => {  // FIX: Change 'gemini-1.5-flash' to 'gemini-1.5-flash-latest' or 'gemini-pro'
  // If 'gemini-1.5-flash-latest' fails, try 'gemini-pro' (text only) or 'gemini-1.5-pro'
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); 

  // 1. Construct the Prompt
  const prompt = `
    You are an expert exam setter. 
    Analyze the provided content (text or image).
    Generate exactly ${count} Multiple Choice Questions (MCQs) based on it.
    The difficulty level should be ${difficulty}.
    
    CRITICAL INSTRUCTION: 
    Return ONLY a raw JSON array. No markdown, no "Here is the JSON".
    
    Structure:
    [
      {
        "question_text": "Question here?",
        "options": [
          {"text": "Option A", "is_correct": false},
          {"text": "Option B", "is_correct": true},
          {"text": "Option C", "is_correct": false},
          {"text": "Option D", "is_correct": false}
        ]
      }
    ]
  `;

  // 2. Prepare Data (Text + Image if exists)
  const parts = [prompt];
  
  if (textInput) parts.push(`Context: ${textInput}`);
  if (fileBuffer) parts.push(fileToGenerativePart(fileBuffer, mimeType));

  // 3. Call Gemini
  try {
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 AI Raw Output:", text); // Debug log to see what AI replies

    // 4. Clean up the response (Remove markdown if AI adds it)
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Error Details:", error); // Detailed logging
    throw new Error("Failed to generate questions from AI");
  }
};