import http from 'http';

const url = 'http://localhost:3000/_next/image?url=https%3A%2F%2Fatydffkpyvxcmzxyibhj.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Furun-gorselleri%2F8691123472984.jpg&w=1080&q=75';

http.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(`Response: ${data}`));
}).on('error', console.error);
