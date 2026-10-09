import { generateTextWithFallback } from './src/lib/ai/providers';

async function main() {
  try {
    const result = await generateTextWithFallback({
      prompt: 'Hello world',
    });
    console.log('Success:', result.text);
  } catch (err) {
    console.error('Final Error:', err);
  }
}

main();
