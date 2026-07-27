import https from 'https';

const urls = [
  'https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/8691123461117.jpg',
  'https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/869112343048.jpg' // Dekorationssauce mit Bananengeschmack 750 gr - EAN from screenshot: 8691123343048, wait let me check the exact EAN from screenshot. It says 8691123343048
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content-Length: ${res.headers['content-length']}`);
    res.resume();
  }).on('error', console.error);
});
