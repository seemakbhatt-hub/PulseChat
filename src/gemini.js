import { GoogleGenerativeAI } from "@google/generative-ai";

// We use import.meta.env to keep your key secret and safe from GitHub's scanners
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const getAIResponse = async (prompt) => {
  try {
    // Using gemini-1.5-flash as it is faster and more reliable for web apps
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "The AI is currently unavailable. Please check your API key configuration.";
  }
};
