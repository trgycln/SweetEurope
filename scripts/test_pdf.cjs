const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = 'dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf';

async function test() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        console.log("TEXT EXTRACTION SUCCESS:");
        console.log("------------------------");
        console.log(data.text);
    } catch (err) {
        console.error("ERROR:", err);
    }
}

test();
