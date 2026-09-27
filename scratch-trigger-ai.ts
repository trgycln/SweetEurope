import fetch from 'node-fetch';

async function trigger() {
  console.log("Triggering API...");
  const res = await fetch('http://localhost:3000/api/admin/generate-blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: "Kafelerde personel eğitimi ve verimlilik" })
  });
  const data = await res.json();
  console.log("Result:", data);
}

trigger();
