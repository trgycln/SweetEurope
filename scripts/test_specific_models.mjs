const key = 'process.env.GEMINI_API_KEY || ''';

const testModels = [
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash'
];

async function run() {
  for (const m of testModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data.error) {
        console.log(`✅ SUCCESS: ${m}`);
      } else {
        console.log(`❌ ${m}: ${data.error.message?.slice(0, 80)}`);
      }
    } catch (e) {
      console.log(`❌ ${m} error/timeout: ${e.message}`);
    }
  }
}

run();
