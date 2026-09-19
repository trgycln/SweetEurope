import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const key = process.env.LEXWARE_API_KEY?.trim() || 'GdCzj-7gI-PO9t.P2sIfEkegNT6U08ONs4CDhhlOLZdCfi9.';

async function testConnection() {
  console.log('Testing Lexware API with key:', key.slice(0, 10) + '...' + key.slice(-5));
  
  for (const host of ['api.lexware.io', 'api.lexoffice.io']) {
    console.log(`\n--- Testing ${host} ---`);
    try {
      const res = await fetch(`https://${host}/v1/profile`, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Response:`, text);
      if (res.ok) {
        console.log(`🎉 SUCCESS connecting to ${host}!`);
      }
    } catch (err: any) {
      console.error(`Error with ${host}:`, err.message);
    }
  }
}

testConnection();
