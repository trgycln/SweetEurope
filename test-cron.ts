import { GET } from './src/app/api/cron/auto-blog/route';

async function main() {
  const req = new Request('http://localhost/api/cron/auto-blog', {
    headers: {
      'authorization': `Bearer ${process.env.CRON_SECRET || ''}`
    }
  });
  console.log('Starting cron request...');
  const start = Date.now();
  const res = await GET(req);
  const end = Date.now();
  
  const text = await res.text();
  console.log(`Finished in ${end - start}ms. Status: ${res.status}`);
  console.log('Response:', text);
}

main();
