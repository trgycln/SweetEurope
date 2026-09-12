const key = 'process.env.GEMINI_API_KEY || ''';

async function findWorkingModels() {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
  const data = await res.json();
  const candidates = (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace('models/', ''));

  console.log('Testing candidates:', candidates);

  for (const model of candidates) {
    try {
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello' }] }]
        })
      });
      const testData = await testRes.json();
      if (!testData.error) {
        console.log(`🎉 WORKING MODEL: ${model}`);
      } else {
        console.log(`❌ ${model}: ${testData.error.message.split('.')[0]}`);
      }
    } catch (e) {
      console.log(`Error testing ${model}:`, e.message);
    }
  }
}

findWorkingModels();
