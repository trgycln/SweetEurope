import fs from 'fs';

async function run() {
    try {
        const pdfModule = await import('pdf-parse');
        const pdf = pdfModule.default || pdfModule;
        const data = fs.readFileSync('chai_tea.pdf');
        const res = await pdf(data);
        console.log(res.text);
    } catch (e) {
        console.error(e);
    }
}
run();
