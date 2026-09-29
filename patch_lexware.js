const fs = require('fs');
let code = fs.readFileSync('src/lib/lexware/invoices.ts', 'utf8');

const target = `  const originalInvoiceId = siparis.lexware_invoice_id;
  if (!originalInvoiceId) {
    throw new Error('Bu siparişe ait kesilmiş bir Lexware faturası bulunamadı.');
  }`;

const replacement = `  // Idempotency: Zaten iptal edilmişse (storno kesilmişse) tekrar kesme
  if (siparis.lexware_storno_id) {
    return {
      creditNoteId: siparis.lexware_storno_id,
      creditNoteNo: siparis.lexware_storno_no,
      stornoPdfUrl: siparis.lexware_storno_pdf_url,
      skipped: true
    } as any;
  }

  const originalInvoiceId = siparis.lexware_invoice_id;
  if (!originalInvoiceId) {
    // Graceful degradation: Fatura yoksa hata fırlatma, geç
    return { creditNoteId: '', creditNoteNo: '', stornoPdfUrl: '', skipped: true } as any;
  }`;

if (code.includes('throw new Error(\'Bu siparişe ait kesilmiş bir Lexware faturası bulunamadı.\');')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/lib/lexware/invoices.ts', code);
  console.log('Patched invoices.ts successfully.');
} else {
  console.log('Target not found in invoices.ts.');
}
