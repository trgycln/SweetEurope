import http from 'http';

const ROUTES = [
    '/tr/admin/dashboard',
    '/tr/admin/urun-yonetimi/urunler',
    '/de/portal/dashboard'
];

async function runTests() {
    console.log('--- Başlatılıyor: Middleware & Rota Koruma Testleri (Route Security) ---\n');
    let passed = 0;
    
    for (const route of ROUTES) {
        console.log(`[TEST] Yetkisiz olarak taranıyor: GET ${route}`);
        
        try {
            const res = await fetch(`http://localhost:3000${route}`, {
                method: 'GET',
                redirect: 'manual' // We want to capture the 307 redirect
            });

            console.log(`-> Sonuç Kodu: ${res.status}`);
            
            if (res.status === 307 || res.status === 308) {
                const location = res.headers.get('location') || '';
                console.log(`✅ BAŞARILI: Yönlendirme algılandı -> ${location}\n`);
                passed++;
            } else if (res.status === 200) {
                console.log(`❌ HATA: Gizli sayfa 200 OK döndü. Veri sızıntısı!\n`);
            } else {
                console.log(`⚠️ UYARI: Beklenmeyen durum kodu döndü: ${res.status}\n`);
            }
        } catch (error) {
            console.error(`❌ HATA: İstek atılamadı:`, error.message, '\n');
        }
    }
    
    console.log(`Testler tamamlandı. Başarılı: ${passed}/${ROUTES.length}`);
}

runTests();
