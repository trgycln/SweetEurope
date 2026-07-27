import fs from 'fs';
import PDFParser from 'pdf2json';

const filePath = 'dokuments/Ürün Etiketleri/surup/FO KARAMEL SURUP-(sekerli).pdf';

async function test() {
    const pdfParser = new PDFParser(this, 1);

    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
        console.log("TEXT EXTRACTION SUCCESS:");
        console.log("------------------------");
        console.log(pdfParser.getRawTextContent());
    });

    pdfParser.loadPDF(filePath);
}

test();
