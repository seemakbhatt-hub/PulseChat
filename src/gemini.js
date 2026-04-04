import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔑 Paste your API key here (we'll get it next step)
const genAI = new GoogleGenerativeAI("YOUR_API_KEY");

export const getAIResponse = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const result = await model.generateContent(prompt);
  const response = await result.response;

  return response.text();
};
