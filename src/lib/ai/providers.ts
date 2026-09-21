import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';

// Create a custom provider for Groq using the OpenAI SDK structure
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// Create a provider for Google Gemini
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Helper to easily get Groq models
export const getGroqModel = (modelName: string = 'qwen/qwen3.8-27b') => {
  return groq(modelName);
};

// Primary High Performance Model: gemini-3.6-flash
export const getGeminiModel = (modelName: string = 'gemini-3.6-flash') => {
  return google(modelName);
};

/**
 * Executes generateText with automatic fallback across models and providers:
 * 1. Google Gemini 3.6 Flash (High context, no 200k TPD block, superior multilingual translation)
 * 2. Groq Qwen 3.8 27B (Fast, reliable)
 * 3. Groq GPT-OSS 20B (Open-source fallback)
 */
export async function generateTextWithFallback(
  options: Omit<Parameters<typeof generateText>[0], 'model'>
) {
  const models = [
    { name: 'Gemini 3.6 Flash', model: google('gemini-3.6-flash') },
    { name: 'Groq Qwen 3.8 27B', model: groq('qwen/qwen3.8-27b') },
    { name: 'Groq GPT-OSS 120B', model: groq('openai/gpt-oss-120b') },
  ];

  let lastError: any;
  for (const item of models) {
    try {
      return await generateText({
        ...options,
        model: item.model,
      });
    } catch (err: any) {
      console.warn(`[AI Providers] ${item.name} failed (${err.message}). Trying next fallback...`);
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Executes generateObject with automatic fallback across models and providers
 */
export async function generateObjectWithFallback(
  options: Omit<Parameters<typeof generateObject>[0], 'model'>
) {
  const models = [
    { name: 'Gemini 3.6 Flash', model: google('gemini-3.6-flash') },
    { name: 'Groq Qwen 3.8 27B', model: groq('qwen/qwen3.8-27b') },
    { name: 'Groq GPT-OSS 120B', model: groq('openai/gpt-oss-120b') },
  ];

  let lastError: any;
  for (const item of models) {
    try {
      return await generateObject({
        ...options,
        model: item.model,
      });
    } catch (err: any) {
      console.warn(`[AI Providers] ${item.name} failed (${err.message}). Trying next fallback...`);
      lastError = err;
    }
  }

  throw lastError;
}

