const key = 'process.env.GEMINI_API_KEY || ''';

async function list() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  if (data.models) {
    for (const m of data.models) {
      console.log(m.name, m.supportedGenerationMethods);
    }
  } else {
    console.log(data);
  }
}
list();
