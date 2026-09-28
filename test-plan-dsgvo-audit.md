
BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: test-plan-dsgvo-audit.md
Hedef Modül: DSGVO (GDPR) Uyumluluğu, GoBD (Alman Vergi Hukuku) Veri Saklama Kuralları ve Denetim İzleri (Audit Trails).
Kapsam: Sistemin teknik güvenliği ve dayanıklılığı kanıtlandı. Bu FİNAL AŞAMASI (Faz 7), platformun Almanya'daki katı hukuki gereksinimlere (Veri Gizliliği ve Muhasebe Kanunları) uygunluğunu test eder. Müşterilerin "Unutulma Hakkı" (Right to be Forgotten) taleplerinin, 10 yıllık fatura saklama zorunluluğu (GoBD) ile çelişmeden nasıl yönetildiği ve veri dışa aktarma (Data Export) süreçleri doğrulanacaktır.
İlişkili Kritik Dosyalar:
src/app/actions/firma-actions.ts (veya müşteri silme/güncelleme işlemleri)
src/app/actions/dsgvo-actions.ts (Oluşturulacak: Veri dışa aktarma ve anonimleştirme)
supabase/migrations/create_siparisler_firmalar_rls.sql (Foreign Key kısıtlamaları)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Legal Compliance Testing (Vitest): "Hard Delete" (Kalıcı Silme) işlemlerinin veritabanı kısıtlamalarıyla (Foreign Key) engellendiğinin ve yerine "Soft Delete / Anonymization" (Anonimleştirme) yapıldığının testi.
Data Portability Testing: Bir müşteriye ait tüm kişisel ve ticari verilerin tek bir JSON formatında eksiksiz dışa aktarılabildiğinin (DSGVO Art. 20) testi.
TEST SENARYOLARI (TEST CASES)
Edge Case 1: GoBD vs DSGVO Çatışması (Soft Delete & Anonymization)
Veritabanında geçmişte sipariş vermiş ve faturası kesilmiş (siparisler tablosunda kaydı olan) bir "Müşteri A" bulunur.
Müşteri A, DSGVO kapsamında hesabının silinmesini talep eder. Admin, paneli üzerinden "Firmayı Sil" işlemini tetikler.
Beklenen Sonuç: Sistem DELETE FROM firmalar sorgusunu ÇALIŞTIRMAMALIDIR (Çalıştırırsa sipariş geçmişi silinir ve GoBD ihlal edilir). Bunun yerine sistem "Soft Delete" yapmalı; firmanın status değerini Pasif veya Silindi yapmalı, email, telefon, yetkili_kisi gibi PII (Kişisel Tanımlanabilir Bilgiler) alanlarını *** veya anonim@deleted.com şeklinde maskelemelidir. Sipariş ve fatura verileri dokunulmadan kalmalıdır.
Edge Case 2: DSGVO Veri Dışa Aktarma (Data Export)
Müşteri B, portal üzerinden "Verilerimi İndir" talebinde bulunur veya Admin bu işlemi tetikler.
Beklenen Sonuç: Sistem; firmalar, profiller, siparisler, adresler ve etkinlikler tablolarındaki Müşteri B'ye ait tüm verileri toplayıp yapılandırılmış bir JSON objesi dönmelidir. Bu işlem sırasında RLS politikaları gereği Müşteri C'ye ait hiçbir veri bu JSON içine sızmamalıdır.
Edge Case 3: AI Sohbet Kayıtlarının (Chat Logs) Temizlenmesi
ai_chat_logs tablosunda 30 günden eski, içinde müşteri isimleri veya e-postaları geçebilecek sohbet kayıtları bulunur.
Beklenen Sonuç: Sisteme eklenecek bir temizlik fonksiyonu (veya cron job simülasyonu), 30 günden eski logları başarıyla silmeli veya kişisel verileri maskelemelidir. Test, bu fonksiyonun sadece eski kayıtları sildiğini, yeni kayıtları koruduğunu doğrulamalıdır.
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: src/app/actions/dsgvo-actions.ts dosyasını oluştur. İçerisine anonymizeCustomerData(firmaId) ve exportCustomerData(firmaId) fonksiyonlarını yaz.

Adım 2: anonymizeCustomerData fonksiyonunda, firmanın siparişi varsa DELETE yerine UPDATE ile kişisel verileri (email, telefon, yetkili_kisi, adres) anonimleştiren mantığı kur.

Adım 3: __tests__/dsgvo-compliance.test.ts dosyasını oluştur. Siparişi olan bir firma için silme işlemi çağrıldığında veritabanından kaydın silinmediğini, ancak email alanının anonim... olarak güncellendiğini expect ile doğrula.

Adım 4: Aynı test dosyasında exportCustomerData fonksiyonunu çağır ve dönen JSON'ın sadece o firmaya ait siparişleri ve profil bilgilerini içerdiğini test et.

Adım 5: Testleri çalıştır (npm run test).

Adım 6: Eğer veritabanında ON DELETE CASCADE gibi tehlikeli bir kısıtlama varsa (siparişlerin silinmesine yol açabilecek), Supabase migration dosyalarını kontrol et ve gerekirse ON DELETE RESTRICT olarak güncelle.
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
GoBD İHLALİ YASAKTIR: Almanya'da ticari belgeler ve faturalar 10 yıl saklanmak zorundadır. Hiçbir DSGVO silme talebi, muhasebeleşmiş bir siparişin veya faturanın veritabanından fiziksel olarak silinmesine (Hard Delete) yol açamaz.
PII (KİŞİSEL VERİ) İZOLASYONU: Anonimleştirme işlemi geri döndürülemez (Irreversible) olmalıdır. Gerçek e-posta veya telefon numarası loglarda dahi kalmamalıdır.
RLS İLE EXPORT: Veri dışa aktarma (Export) işlemi kesinlikle service_role ile değil, işlemi talep eden müşterinin kendi authenticated token'ı (veya yetkili Admin token'ı) ile çalıştırılmalı, böylece IDOR riski sıfıra indirilmelidir.