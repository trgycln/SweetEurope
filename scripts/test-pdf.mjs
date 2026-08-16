import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function test() {
  const filePath = 'dokuments/Ürün Etiketleri/barsos/FO-TOFFEE-KARAMEL-BARSOS-2,5-YY-C.pdf';
  const dataBuffer = fs.readFileSync(filePath);

  try {
    console.log('pdf export:', pdf);
    const pdfFunc = pdf.default || pdf;
    const data = await pdfFunc(dataBuffer);
    console.log(data.text);
  } catch (err) {
    console.error(err);
  }
}

test();
