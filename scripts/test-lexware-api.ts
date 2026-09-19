import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const key = process.env.LEXWARE_API_KEY?.trim();

async function test() {
  const res = await fetch('https://api.lexware.io/v1/contacts', {
    headers: {
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json'
    }
  });
  console.log('Contacts GET status:', res.status);
  const data = await res.json();
  console.log('Contacts data:', JSON.stringify(data, null, 2));
}

test();
