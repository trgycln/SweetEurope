import http from 'http';

const API_ROUTES = [
    { path: '/api/admin/create-personel-user', method: 'POST' },
    { path: '/api/admin/delete-user', method: 'POST' },
    { path: '/api/admin/documents/folders', method: 'GET' }
];

async function runTests() {
    console.log('--- Başlatılıyor: API Yetkilendirme Testleri (Endpoint Security) ---\n');
    let passed = 0;
    
    for (const route of API_ROUTES) {
        console.log(`[TEST] Yetkisiz erişim deneniyor: ${route.method} ${route.path}`);
        
        try {
            const res = await fetch(`http://localhost:3000${route.path}`, {
                method: route.method,
                headers: { 'Content-Type': 'application/json' }
                // No cookies, no auth token!
            });

            console.log(`-> Sonuç Kodu: ${res.status}`);
            
            if (res.status === 401 || res.status === 403 || res.status === 307) {
                console.log('✅ BAŞARILI: Yetkisiz erişim güvenli şekilde engellendi.\n');
                passed++;
            } else if (res.status === 400 || res.status === 405) {
                // E.g. Bad Request or Method Not Allowed can also imply it didn't leak data, but 401/403 is better
                console.log(`⚠️ UYARI: Erişim engellendi ancak durum kodu yetkilendirme (401/403) yerine ${res.status} döndü.\n`);
                passed++; // Stricly speaking, it didn't leak data
            } else {
                console.log(`❌ HATA: Uç nokta yetkisiz erişime izin vermiş veya beklenmeyen hata vermiş olabilir!\n`);
            }
        } catch (error) {
            console.error(`❌ HATA: İstek atılamadı (Sunucu kapalı olabilir):`, error.message, '\n');
        }
    }
    
    console.log(`Testler tamamlandı. Başarılı: ${passed}/${API_ROUTES.length}`);
}

runTests();
