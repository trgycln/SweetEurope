import http from 'http';
import https from 'https';

const url = 'https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/8691123472984.jpg';

https.get(url, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.resume();
}).on('error', (e) => {
  console.error(e);
});
