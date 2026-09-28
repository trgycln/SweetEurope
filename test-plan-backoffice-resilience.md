BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: test-plan-backoffice-resilience.md
Hedef Modül: Arka Ofis Operasyonları (Back-Office), Smart DMS (Akıllı Doküman Yönetimi) ve Lexware Müşteri Senkronizasyonu.
Kapsam: Müşteri tarafı (Frontend/Portal) tamamen güvenli hale getirildi. Bu FİNAL AŞAMASI (Faz 6), şirket içi operasyonların (ERP) dayanıklılığını test eder. Google Drive kotasının dolması, Gemini AI'ın halüsinasyon görmesi (hatalı JSON dönmesi) veya Lexware muhasebe sisteminin geçersiz vergi numarası (USt-IdNr) nedeniyle müşteri kaydını reddetmesi gibi durumlarda sistemin çökmemesi ve "Zarif Bozulma" (Graceful Degradation) prensibiyle çalışmaya devam etmesi hedeflenmektedir.
İlişkili Kritik Dosyalar:
src/lib/ai/document-analyzer.ts (Gemini AI PDF Analizi)
src/lib/google-drive/service.ts (Google Drive Yükleme Servisi)
src/lib/lexware/contacts.ts (Lexware Müşteri Senkronizasyonu)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Fault Tolerance & Mock Testing (Vitest): 3. parti servislerin (Google Drive, Gemini, Lexware) kasıtlı olarak hata fırlattığı (Mocking) senaryolarda sistemin verdiği tepkilerin ölçülmesi.
Data Validation Testing: Alman muhasebe standartlarına uymayan (geçersiz formatlı) verilerin Lexware API'sine gönderilmeden önce veya gönderildiğinde nasıl handle edildiğinin testi.
TEST SENARYOLARI (TEST CASES)
Negative Path 1: Gemini AI Halüsinasyonu (Malformed JSON)
Admin, Smart DMS üzerinden bir PDF faturası yükler.
Gemini AI servisi, beklenen JSON formatı yerine düz metin (Plain Text) veya eksik/hatalı bir JSON string döner.
Beklenen Sonuç: analyzeDocument fonksiyonu bu hatayı yakalamalı (try/catch), sistemi çökertmemeli ve frontend'e "AI Analizi başarısız oldu, lütfen bilgileri manuel giriniz" şeklinde kontrollü bir hata mesajı dönmelidir.
Negative Path 2: Google Drive Kota Aşımı / API Çökmesi
Admin, onaylanmış bir evrakı sisteme kaydetmek ister (/api/admin/documents/confirm).
Google Drive API, 403 Quota Exceeded veya 500 Internal Server Error hatası fırlatır.
Beklenen Sonuç: Dosya Drive'a yüklenemediği için Supabase belgeler tablosuna EKSİK (drive_url olmadan) kayıt ATILMAMALIDIR. İşlem tamamen iptal edilmeli (Rollback) ve kullanıcıya "Drive yüklemesi başarısız oldu, işlem iptal edildi" uyarısı gösterilmelidir.
Edge Case 3: Lexware Müşteri Senkronizasyonu Reddi (Invalid VAT ID)
Yeni bir B2B müşterisi, geçersiz bir Vergi Numarası (örn: DE123 yerine sadece 123) ile sisteme kaydolur ve sipariş verir.
Sistem getOrCreateLexwareContact fonksiyonunu çağırarak Lexware'de müşteri kartı açmaya çalışır. Lexware API 400 Bad Request (Invalid VAT Registration ID) döner.
Beklenen Sonuç: Lexware hatası (LexwareApiError) yakalanmalı, sipariş Supabase'e kaydedilmeye devam etmeli (müşteri mağdur edilmemeli), ancak admin paneline "Lexware Müşteri Kartı Açılamadı: Geçersiz Vergi No" şeklinde bir iç bildirim (Internal Notification) düşmelidir.
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: __tests__/smart-dms-resilience.test.ts dosyasını oluştur. generateObject (Gemini) fonksiyonunu mocklayarak hatalı JSON fırlatmasını sağla ve analyzeDocument fonksiyonunun çökmeden kontrollü hata döndüğünü expect ile doğrula.

Adım 2: Aynı test dosyasında uploadPdfToDrive fonksiyonunu mocklayarak hata fırlatmasını sağla. Kayıt endpoint'inin (veya ilgili servis fonksiyonunun) Supabase'e kayıt atmadan işlemi sonlandırdığını doğrula.

Adım 3: __tests__/lexware-sync.test.ts dosyasını oluştur. lexwareFetch fonksiyonunu mocklayarak 400 Bad Request dönmesini sağla. getOrCreateLexwareContact fonksiyonunun bu hatayı doğru şekilde fırlattığını ve sipariş akışının (önceki testlerde yazılan try/catch blokları sayesinde) bu hatayı tolere edip siparişi kaydettiğini doğrula.

Adım 4: Testleri çalıştır (npm run test).

Adım 5: Eğer Drive hatasında Supabase'e boş kayıt atılıyorsa veya Lexware hatası siparişi tamamen iptal ediyorsa, ilgili kaynak kodlarda (Transaction mantığı veya Try/Catch blokları) gerekli düzeltmeleri yap.
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
MOCK ZORUNLULUĞU: Bu testler sırasında KESİNLİKLE gerçek Google Drive klasörüne dosya yüklenmeyecek ve gerçek Lexware hesabında test müşterisi oluşturulmayacaktır. Tüm 3. parti çağrılar vi.mock ile izole edilmelidir.
ATOMİK İŞLEMLER (TRANSACTIONS): Birbirine bağımlı işlemler (Örn: Drive'a yükle -> Supabase'e yaz) atomik olmalıdır. Biri başarısız olursa diğeri de geri alınmalıdır (Rollback).
SESSİZ HATALAR (SILENT FAILURES) YASAKTIR: Lexware veya Drive başarısız olduğunda sistem çalışmaya devam etmeli (Resilience), ancak bu başarısızlık KESİNLİKLE loglanmalı ve adminlere bildirilmelidir. Hataların sessizce yutulması (empty catch blocks) kabul edilemez.