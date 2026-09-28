BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: test-plan-post-golive-monitoring.md
Hedef Modül: Canlı Ortam Sonrası Sentetik İzleme (Synthetic Monitoring), CI/CD Entegrasyonu ve Veritabanı Sağlık Kontrolü (Database Health Check).
Kapsam: Sistem başarıyla canlıya (Production) alındı. Bu SÜREKLİ AŞAMA (Faz 10 - Post-Go-Live), sistemin zaman içinde bozulmamasını (Regression), her yeni kod eklendiğinde testlerin otomatik koşulmasını ve canlı ortamın 7/24 ayakta kalıp kalmadığının (Uptime) otomatik botlarla izlenmesini kapsar.
İlişkili Kritik Dosyalar:
.github/workflows/playwright.yml (veya ilgili CI/CD pipeline dosyası)
.github/workflows/synthetic-monitoring.yml (Saatlik canlı ortam kontrolü)
scripts/db-health-check.ts (Veritabanı tutarlılık kontrolü)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Continuous Integration (GitHub Actions / Vercel): Ana branch'e (main) açılan her Pull Request'te (PR) tüm Unit ve E2E testlerinin otomatik koşulması ve testler geçmeden kodun birleştirilmesinin (Merge) engellenmesi.
Synthetic Monitoring (Playwright + Cron): Canlı ortamın (https://elysonsweets.de) her saat başı otomatik bir Playwright botu tarafından ziyaret edilerek kritik B2B akışlarının (Katalog yüklenmesi, Login ekranı yanıt süresi) kontrol edilmesi.
Database Integrity Check (Supabase/TypeScript): Canlı kullanımdan kaynaklanabilecek "yetim kayıtlar" (orphaned records) veya asılı kalmış sepetlerin haftalık olarak taranması.
TEST SENARYOLARI (TEST CASES)
Senaryo 1: CI/CD Pipeline Gatekeeper (Regresyon Koruması)
Geliştirici, sisteme yeni bir özellik ekler ve main branch'ine PR açar.
Beklenen Sonuç: GitHub Actions otomatik olarak tetiklenmeli, npm run test ve npm run test:e2e komutlarını izole bir ortamda çalıştırmalıdır. Eğer yeni kod, eski bir özelliği (örneğin KDV hesaplamasını) bozduysa, pipeline "Failed" durumuna düşmeli ve canlıya çıkışı (Deployment) kesin olarak engellemelidir.
Senaryo 2: Sentetik İzleme (Hourly Smoke Test)
GitHub Actions Cron Job, her saat başı canlı siteye (Production) gizli bir istek atar.
Beklenen Sonuç: Bot, anasayfanın ve /de/login sayfasının 3 saniye içinde HTTP 200 ile açıldığını doğrulamalıdır. Eğer site çökerse (HTTP 500) veya yanıt süresi 10 saniyeyi aşarsa, adminlere acil durum e-postası (veya Slack/Discord bildirimi) gönderilmelidir.
Senaryo 3: Veritabanı Sağlık Taraması (Orphaned Data Check)
Haftalık çalışan bir script, siparis_detay tablosunda siparis_id'si olmayan veya alt_bayi_stoklari tablosunda geçersiz bir urun_id'ye işaret eden kayıtları arar.
Beklenen Sonuç: Veritabanı ilişkisel bütünlüğünü (Referential Integrity) korumalıdır. Script, 0 yetim kayıt bulmalı ve "Database Health: 100% OK" raporu üretmelidir.
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: Projenin kök dizininde .github/workflows klasörü oluştur (yoksa).

Adım 2: .github/workflows/playwright.yml dosyasını oluştur. İçerisine Node.js kurulumu, bağımlılıkların yüklenmesi (npm ci), Playwright tarayıcılarının kurulması ve npm run test:e2e komutunun çalıştırılması adımlarını ekle.

Adım 3: .github/workflows/synthetic-monitoring.yml dosyasını oluştur. on: schedule: - cron: '0 * * * *' (her saat başı) tetiklenecek şekilde ayarla. Sadece tests/e2e/smoke-production.spec.ts dosyasını çalıştıracak şekilde yapılandır.

Adım 4: scripts/db-health-check.ts dosyasını oluştur. Supabase admin client kullanarak kritik tablolardaki (siparisler, firmalar, urunler) tutarsızlıkları tarayan basit bir SQL/RPC sorgusu veya veri analizi yaz.

Adım 5: CI/CD pipeline'larının başarıyla tetiklendiğini doğrulamak için boş bir commit at (git commit --allow-empty -m "Trigger CI") ve GitHub Actions (veya Vercel Checks) sekmesini izle.
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
CANLI ORTAMDA YÜK TESTİ YASAKTIR: Sentetik izleme (Synthetic Monitoring) botları, canlı siteye asla saniyede onlarca istek atan "Load Test" (Yük Testi) formatında çalışmamalıdır. Sadece tek bir kullanıcı gibi davranıp çıkmalıdır.
GİZLİ DEĞİŞKENLERİN (SECRETS) KORUNMASI: GitHub Actions yml dosyalarında STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY gibi kritik değişkenler asla düz metin (plain text) olarak yazılmamalı, GitHub Repository Secrets üzerinden ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }} şeklinde çağrılmalıdır.
TEST MÜŞTERİSİ İZOLASYONU: Eğer sentetik testler canlı ortamda login olmayı deneyecekse, bu işlem KESİNLİKLE gerçek bir müşteri hesabı ile değil, yetkileri kısıtlanmış, sipariş verme yetkisi olmayan özel bir "monitoring@elysonsweets.de" test hesabı ile yapılmalıdır.