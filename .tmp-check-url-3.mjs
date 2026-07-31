import https from 'https';

const ean = '8691123473264';
const urls = [
  `https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/${ean}.jpg`,
  `https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/${ean}.png`,
  `https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/fo-findik.jpg`
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.statusCode}`);
    res.resume();
  }).on('error', console.error);
});
