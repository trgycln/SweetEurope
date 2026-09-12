const key = 'process.env.GEMINI_API_KEY || ''';

async function test(model) {
  console.log(`Testing ${model}...`);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with: {"status": "ok"}' }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json'
        }
      })
    });
    const data = await res.json();
    if (data.error) {
      console.log(`❌ ${model} error:`, data.error.message);
    } else {
      console.log(`✅ ${model} success:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
    }
  } catch (err) {
    console.error(`❌ ${model} exception:`, err);
  }
}

async function run() {
  await test('gemini-3.1-pro-preview');
  await test('gemini-3.8-flash');
}

run();
