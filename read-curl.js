const fs = require('fs');
const content = fs.readFileSync('temp_curl_output.txt', 'utf16le');
console.log('--- START ---');
console.log(content.slice(0, 1500));
console.log('--- END ---');
console.log(content.slice(-1500));
