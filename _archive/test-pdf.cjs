const fs = require('fs');
const pdf = require('pdf-parse');
const data = fs.readFileSync('chai_tea.pdf');
pdf(data).then(res => console.log(res.text)).catch(console.error);
