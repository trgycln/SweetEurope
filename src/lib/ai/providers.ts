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

// Primary High Performance Model: gemini-1.5-flash
export const getGeminiModel = (modelName: string = 'gemini-1.5-flash') => {
  return google(modelName);
};

/**
 * Executes generateText with automatic fallback across models and providers:
 * 1. Google Gemini 3.6 Flash (High context, superior multilingual translation)
 * 2. Groq GPT-OSS 120B (Fast, reliable high parameter model)
 * 3. Groq Qwen 3.8 27B (Fast fallback)
 */
export async function generateTextWithFallback(
  options: Omit<Parameters<typeof generateText>[0], 'model'>
) {
  const models = [
    { name: 'Groq GPT-OSS 120B', model: groq('openai/gpt-oss-120b') },
    { name: 'Groq Qwen 3.8 27B', model: groq('qwen/qwen3.8-27b') },
    { name: 'Gemini 1.5 Flash', model: google('gemini-1.5-flash') },
  ];

  let lastError: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const item of models) {
      try {
        console.log(`[AI Providers] Attempt ${attempt}: Trying model ${item.name}...`);
        const isGoogle = item.name.includes('Gemini');
        const googleSafety = isGoogle ? {
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        } : {};

        const optionsWithSafety = { ...options, ...googleSafety } as any;

        const result = await generateText({
          ...optionsWithSafety,
          model: item.model,
        });
        
        if (!result.text || result.text.trim() === '') {
          throw new Error("AI returned empty text. (Possible rate limit or safety filter block)");
        }
        
        return result;
      } catch (err: any) {
        console.warn(`[AI Providers] ${item.name} failed (${err.message})`);
        lastError = err;
      }
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
    { name: 'Groq GPT-OSS 120B', model: groq('openai/gpt-oss-120b') },
    { name: 'Groq Qwen 3.8 27B', model: groq('qwen/qwen3.8-27b') },
    { name: 'Gemini 1.5 Flash', model: google('gemini-1.5-flash') },
  ];

  let allErrors: any[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const item of models) {
      try {
        console.log(`[AI Providers] Attempt ${attempt}: Trying model ${item.name}...`);
        return await generateObject({
          ...options,
          model: item.model,
        });
      } catch (err: any) {
        console.warn(`[AI Providers] ${item.name} failed (${err.message})`);
        allErrors.push(`${item.name}: ${err.message}`);
      }
    }
  }

  throw new Error(`All models failed. Errors: ${allErrors.join(' | ')}`);
}

