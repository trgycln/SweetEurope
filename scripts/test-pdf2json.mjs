import fs from 'fs';
import PDFParser from 'pdf2json';

async function testPdf2Json() {
  const filePath = 'dokuments/Ürün Etiketleri/barsos/FO_BEYAZ_CIKOLATA_BAR_SOS_2,5KG_YY-DIS-TIC.pdf';

  const pdfParser = new PDFParser(this, 1);

  pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
  pdfParser.on("pdfParser_dataReady", pdfData => {
      console.log(pdfParser.getRawTextContent());
  });

  pdfParser.loadPDF(filePath);
}

testPdf2Json();
