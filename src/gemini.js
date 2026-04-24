import { GoogleGenerativeAI } from "@google/generative-ai";

// Use an environment variable instead of hardcoding the key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const getAIResponse = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 'gemini-pro' is older; flash is faster
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Sorry, I'm having trouble thinking right now.";
  }
};
