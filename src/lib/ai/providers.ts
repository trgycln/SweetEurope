import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Create a custom provider for Groq using the OpenAI SDK structure
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// Helper to easily get Groq models
// Primary: openai/gpt-oss-120b
// Fast/Fallback: qwen/qwen3.8-27b
export const getGroqModel = (modelName: string = 'openai/gpt-oss-120b') => {
  return groq(modelName);
};

// Create a provider for Google Gemini (for CEO / High Context orchestration)
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Primary CEO Model: gemini-1.5-pro
export const getGeminiModel = (modelName: string = 'gemini-1.5-pro') => {
  return google(modelName);
};
