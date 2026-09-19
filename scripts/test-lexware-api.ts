import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const key = process.env.LEXWARE_API_KEY?.trim();

async function test() {
  const invoiceId = "0a303ad2-b5d6-4bb5-be5b-a37bc0ed6ddd";
  const res = await fetch(`https://api.lexware.io/v1/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${key}`
    }
  });
  console.log('Invoice DELETE status:', res.status);
}

test();
