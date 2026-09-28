- BAĞLAM VE PROJE DURUMU (CONTEXT)
Dosya Adı: `project-signoff-and-maintenance-guide.md`

Hedef: Proje Kapanışı (Sign-off), Sistem Özeti ve Gelecek Geliştirmeler İçin Bakım Rehberi.
Kapsam: Elyson Sweets (elysonsweets.de) B2B E-Ticaret ve ERP platformunun tüm kalite güvence (QA), güvenlik, finansal doğruluk, yasal uyumluluk (DSGVO/GoBD) ve canlı ortam (Production) testleri %100 başarıyla tamamlanmıştır. Bu belge, Antigravity IDE'nin görevini başarıyla tamamladığını onaylayan resmi bir "Sign-off" (Kapanış ve Teslim) belgesidir. Bundan sonraki süreçte sisteme eklenecek yeni özelliklerin mevcut kusursuz yapıyı bozmaması için bir anayasa niteliği taşır.

- SİSTEM MİMARİSİ VE GÜVENLİK ÖZETİ (ARCHITECTURE HIGHLIGHTS)
Antigravity IDE ile yürütülen bu yoğun QA ve Refactoring süreci sonucunda sistem aşağıdaki kurşun geçirmez (bulletproof) standartlara ulaşmıştır:

1. Zero-Trust Finansal Mimari: Frontend'den gelen hiçbir fiyata güvenilmez. Tüm B2B kademeli fiyatlandırmaları (Alt Bayi, Toptancı, Palet) ve KDV/Kargo hesaplamaları sunucuda (Server-side) yeniden hesaplanır.
2. Kaufmännisches Runden (Ticari Yuvarlama): JavaScript'in floating-point hataları giderilmiş, Alman muhasebe standartlarına uygun kuruş hassasiyetinde hesaplama altyapısı kurulmuştur.
3. IDOR ve RLS Koruması: Hiçbir müşteri, URL manipülasyonu ile başka bir müşterinin faturasına, siparişine veya özel belgelerine erişemez.
4. Yasal Uyumluluk (DSGVO & GoBD): Müşteri silme talepleri, 10 yıllık fatura saklama zorunluluğu ile çelişmemesi için "Soft Delete / Anonimleştirme" yöntemiyle çözülmüştür.
5. Resilience (Dayanıklılık): Lexware, Google Drive, Resend veya Gemini AI gibi 3. parti servislerin çökmesi durumunda sistem ana sipariş akışını bozmaz, zarifçe bozulur (Graceful Degradation) ve adminleri uyarır.
6. CI/CD & Gözlemlenebilirlik: Her yeni kod eklendiğinde testler otomatik koşulur ve canlı site her saat başı sentetik botlarla denetlenir.

- GELECEK GELİŞTİRMELER İÇİN KATI KURALLAR (RULES FOR FUTURE DEVELOPMENT)
Sisteme yeni bir özellik (Feature) ekleneceği zaman aşağıdaki kurallar KESİNLİKLE ihlal edilmeyecektir:

* Kural 1: Test-Driven Development (TDD) Zorunluluğu
Yeni bir API route'u veya veritabanı tablosu eklendiğinde, kodu yazmadan önce mutlaka `__tests__` klasörüne ilgili Unit/Integration testleri yazılacaktır. Testi olmayan hiçbir kod `main` branch'ine merge edilmeyecektir.

* Kural 2: Veritabanı Migrasyon Disiplini
Canlı veritabanında (Production) asla `DROP TABLE` veya `DROP COLUMN` gibi yıkıcı (destructive) komutlar kullanılmayacaktır. Tüm şema değişiklikleri Supabase migration dosyaları üzerinden `ADD COLUMN` veya `CREATE TABLE IF NOT EXISTS` şeklinde, geriye dönük uyumlu (backward-compatible) yapılacaktır.

* Kural 3: Yapay Zeka (AI) Maliyet ve Güvenlik Kontrolü
Sisteme eklenecek yeni AI özellikleri (örn: yeni bir asistan veya doküman okuyucu), mutlaka Rate Limiting (Hız Sınırlandırması) arkasına alınacak ve prompt injection saldırılarına karşı sistem komutları (System Prompts) katı kurallarla korunacaktır.

* Kural 4: B2B İş Mantığı Önceliği
Sistem bir B2C (Son Tüketici) sitesi değildir. Eklenecek her yeni UI/UX özelliği, toptancıların hızlı sipariş verme (Quick Order) ergonomisini bozmamalı, fiyatlar her zaman NET + MwSt şeklinde şeffaf gösterilmelidir.

- KAPANIŞ VE ONAY (SIGN-OFF)
- [x] Tüm güvenlik açıkları (IDOR, Payload Manipulation) kapatıldı.
- [x] Finansal hesaplamalar ve veritabanı kilitleri (Race Conditions) güvence altına alındı.
- [x] Dış servis entegrasyonları (Lexware, Stripe, Drive, AI) hata toleranslı (Fault Tolerant) hale getirildi.
- [x] CI/CD pipeline ve Sentetik İzleme (Synthetic Monitoring) aktif edildi.

Sistem "Production-Ready" (Canlı Kullanıma Hazır) durumdadır. 
Görev başarıyla tamamlanmıştır. 🚀