const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Proje ayarları
const PROJECT_ID = "atydffkpyvxcmzxyibhj";
const OUTPUT_FILE = "src/lib/supabase/database.types.ts";

console.log('Supabase tipleri çekiliyor, lütfen bekleyin...');

// Komutu çalıştır (Dosyaya yazdırma yapmadan, sadece veriyi al)
exec(`npx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Hata oluştu: ${error.message}`);
        return;
    }
    if (stderr) {
        // Supabase bazen bilgi mesajlarını stderr üzerinden gönderir, hata olmayabilir.
        console.log(`Bilgi: ${stderr}`);
    }

    try {
        // Dosya yolunu hazırla
        const filePath = path.join(process.cwd(), OUTPUT_FILE);
        
        // Çıktıyı UTF-8 formatında dosyaya yaz
        fs.writeFileSync(filePath, stdout, 'utf8');
        
        console.log('✅ İşlem Tamamlandı!');
        console.log(`Dosya oluşturuldu: ${filePath}`);
    } catch (err) {
        console.error('Dosya yazma hatası:', err);
    }
});