import https from 'https';

const urls = [
  'https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/8691123472984.jpg',
  'https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/8691123473707.jpg'
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
