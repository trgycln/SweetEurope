const fs = require('fs');
let code = fs.readFileSync('src/app/actions/siparis-actions.ts', 'utf8');

// 1. Add Idempotency
const statusCheckRegex = /\/\/ 5\. Statuspr.*?fung\s*\/\/.*?\s*if \(siparis\.siparis_durumu !== 'Beklemede' && siparis\.siparis_durumu !== 'processing'\) \{/s;
code = code.replace(statusCheckRegex, `        if (siparis.siparis_durumu === 'İptal Edildi' || siparis.siparis_durumu === 'cancelled') {
            return { success: true, message: 'Zaten iptal edildi' };
        }

        // 5. Statusprüfung
        // Annahme: Nur 'Beklemede' oder 'processing' können storniert werden
        if (siparis.siparis_durumu !== 'Beklemede' && siparis.siparis_durumu !== 'processing') {`);

// 2. Add Stock Restore & Lexware
const todoRegex = /\/\/ TODO Optional: Lagerbestand wieder erh.*?hen\? \(Besser DB-Funktion\/Trigger\)/s;
code = code.replace(todoRegex, `        // 6.1. Stokları iade et
        try {
            const { createSupabaseServiceClient } = await import('../../lib/supabase/service');
            const adminClient = createSupabaseServiceClient();
            await adminClient.rpc('restore_order_stock' as any, { p_siparis_id: siparisId });
        } catch (e) {
            console.error('Stok iadesi yapılamadı:', e);
        }

        // 6.2. Lexware faturasını iptal et (Storno)
        try {
            const { cancelLexwareInvoiceForOrder } = await import('@/lib/lexware/invoices');
            await cancelLexwareInvoiceForOrder(siparisId, 'Kundenstornierung');
        } catch (e) {
            console.error('Lexware faturası iptal edilemedi:', e);
        }`);

fs.writeFileSync('src/app/actions/siparis-actions.ts', code);
console.log('Patched siparis-actions.ts successfully.');
