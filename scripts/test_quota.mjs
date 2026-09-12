const key = 'process.env.GEMINI_API_KEY || ''';

async function test() {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
  ];
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with OK' }] }] })
      });
      const data = await res.json();
      if (data.error) {
        console.log(`[${m}] ERROR:`, data.error.message.substring(0, 150));
      } else {
        console.log(`[${m}] SUCCESS:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      }
    } catch (e) {
      console.log(`[${m}] EXCEPTION:`, e.message);
    }
  }
}
test();
