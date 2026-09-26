🏗️ Mimari ve İş Akışı Özeti
Bu sistem 5 ana modülden oluşacaktır:
DB Migration: belgeler tablosuna AI ve Drive kolonlarının eklenmesi.
Google Drive Service: Service Account ile izole dosya yükleme modülü.
Gemini AI Service: PDF'i okuyup JSON formatında yapılandırılmış veri (özet, etiket, tarih) çıkaran modül.
Orchestrator API'ler: /analyze (Önizleme için) ve /confirm (Kayıt için) endpoint'leri.
Frontend UI: Kullanıcının AI verilerini görüp onaylayacağı React (Next.js) bileşeni.
🚀 ADIM 1: Veritabanı Güncellemesi (Supabase Migration)
IDE'ye verilecek prompt:
code
Text
Bir Supabase migration dosyası oluştur. Adı: `20261001_smart_dms_columns.sql` olsun.
Mevcut `belgeler` tablosuna şu kolonları ekle:
- `drive_file_id` (TEXT, nullable)
- `drive_url` (TEXT, nullable)
- `ai_summary` (TEXT, nullable)
- `ai_tags` (TEXT[], nullable)
- `ai_metadata` (JSONB, nullable) - Kritik tarihler, tutarlar vb. ekstra veriler için.

Ayrıca `src/lib/supabase/database.types.ts` dosyasını bu yeni kolonları içerecek şekilde manuel olarak güncelle (gen:types komutunu beklemeden tipleri ekle).
🚀 ADIM 2: Google Drive Servisinin Yazılması
IDE'ye verilecek prompt:
code
Text
`src/lib/google-drive/service.ts` adında yeni bir dosya oluştur.
Bu dosya sadece Google Drive işlemlerinden sorumlu izole bir servis olmalıdır.
Gereksinimler:
1. `googleapis` paketini kullan.
2. `.env.local` içinden `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY` ve `GOOGLE_DRIVE_FOLDER_ID` değişkenlerini kullanarak Service Account (JWT) kimlik doğrulaması yap.
3. `uploadPdfToDrive(buffer: Buffer, fileName: string, mimeType: string = 'application/pdf')` adında bir fonksiyon yaz.
4. Fonksiyon, dosyayı Drive'a yüklemeli ve geriye `{ driveFileId: string, webViewLink: string }` dönmelidir.
5. Hata yönetimi (try/catch) ekle ve hataları konsola anlamlı şekilde bas.
🚀 ADIM 3: Gemini AI Doküman Analiz Servisi
IDE'ye verilecek prompt:
code
Text
`src/lib/ai/document-analyzer.ts` adında yeni bir dosya oluştur.
Bu dosya PDF buffer'ını alıp Gemini 1.5 Flash/Pro modeline gönderecek ve JSON dönecektir.
Gereksinimler:
1. `@google/genai` veya `@ai-sdk/google` kullan. (Projede halihazırda `src/lib/ai/providers.ts` var, oradaki yapıyı kullanabilirsin).
2. `analyzeDocument(pdfBuffer: Buffer, originalName: string)` adında bir fonksiyon yaz.
3. Gemini'a şu System Prompt'u ver: "Sen kıdemli bir B2B evrak analiz uzmanısın. Sana verilen PDF'i incele ve şu JSON formatında çıktı ver: { suggested_name: 'Kısa ve anlaşılır dosya adı', summary: 'Evrakın 2-3 cümlelik özeti', category: 'Fatura | Sözleşme | İrsaliye | Diğer', tags: ['etiket1', 'etiket2'], critical_dates: ['YYYY-MM-DD'] }."
4. Modelin `temperature: 0` ve `response_mime_type: "application/json"` ayarlarını kesinlikle yap.
5. Dönen JSON string'ini parse edip TypeScript interface'i (`AiDocumentAnalysis`) olarak geri döndür.
🚀 ADIM 4: Orchestrator API - Aşama 1 (Analiz Endpoint'i)
IDE'ye verilecek prompt:
code
Text
`src/app/api/admin/documents/analyze/route.ts` adında bir Next.js App Router POST endpoint'i oluştur.
İş Akışı:
1. Request'ten `multipart/form-data` olarak gelen PDF dosyasını al.
2. Dosyayı memory'de bir Buffer'a çevir (Vercel ortamında temp file yerine memory buffer daha güvenlidir, dosya boyutu limitlerine dikkat et).
3. `document-analyzer.ts` içindeki `analyzeDocument` fonksiyonunu çağırarak PDF'i Gemini'a gönder.
4. Gemini'dan dönen JSON verisini (önerilen isim, özet, etiketler) HTTP 200 ile Frontend'e dön.
Not: Bu aşamada veritabanına veya Drive'a KAYIT YAPILMAYACAK. Sadece analiz verisi dönecek.
🚀 ADIM 5: Orchestrator API - Aşama 2 (Onay ve Kayıt Endpoint'i)
IDE'ye verilecek prompt:
code
Text
`src/app/api/admin/documents/confirm/route.ts` adında bir POST endpoint'i oluştur.
İş Akışı:
1. Request'ten `multipart/form-data` olarak PDF dosyasını VE kullanıcının frontend'de düzenleyip onayladığı AI verilerini (JSON string olarak) al.
2. `google-drive/service.ts` içindeki `uploadPdfToDrive` fonksiyonunu çağırarak dosyayı Google Drive'a yükle. Dosya adı olarak kullanıcının onayladığı `suggested_name` değerini kullan.
3. Drive'dan dönen `driveFileId` ve `webViewLink` değerlerini al.
4. Supabase Server Client (`src/lib/supabase/server.ts`) kullanarak `belgeler` tablosuna yeni bir kayıt at.
   - Kaydedilecek alanlar: `ad` (onaylanan isim), `kategori`, `ai_summary`, `ai_tags`, `drive_file_id`, `drive_url`, `olusturma_tarihi` (şu an).
5. Başarılı olursa HTTP 200 ile eklenen kaydın ID'sini dön.
🚀 ADIM 6: Frontend - Akıllı Yükleme Modalı (Smart Upload UI)
IDE'ye verilecek prompt:
code
Text
`src/components/admin/documents/SmartUploadModal.tsx` adında bir React (Client Component) bileşeni oluştur.
Bu bileşen Tailwind CSS ve Lucide-react ikonları kullanmalıdır.
İş Akışı ve UI Durumları (States):
1. **State 1 (Upload):** Kullanıcı bir PDF seçer/sürükler.
2. **State 2 (Analyzing):** Dosya `/api/admin/documents/analyze` endpoint'ine gider. Ekranda "Yapay Zeka Dokümanı İnceliyor..." şeklinde şık bir loading animasyonu (Pulse/Spinner) çıkar.
3. **State 3 (Review & Confirm):** AI'dan dönen veri bir form içinde gösterilir.
   - Input: Dosya Adı (AI önerisi, değiştirilebilir)
   - Textarea: Özet (AI önerisi, değiştirilebilir)
   - Select: Kategori
   - Badges/Tags: Etiketler (Silinebilir/Eklenebilir)
4. Kullanıcı "Onayla ve Drive'a Kaydet" butonuna basar.
5. Veriler ve PDF `/api/admin/documents/confirm` endpoint'ine gider.
6. Başarılı olursa `sonner` toast ile "Evrak başarıyla akıllı sisteme kaydedildi" mesajı verilir ve modal kapanır.
🚀 ADIM 7: Entegrasyon ve Temizlik
IDE'ye verilecek prompt:
code
Text
1. Oluşturduğumuz `SmartUploadModal` bileşenini, admin panelindeki mevcut Evrak Yönetimi sayfasına (`src/app/[locale]/admin/belgeleri-yonet/page.tsx` veya ilgili sayfa) entegre et. Eski yükleme butonunu "Akıllı Yükleme (AI)" butonu ile değiştir.
2. `next.config.ts` dosyasında Google Drive resim/dosya URL'lerine izin vermek için `remotePatterns` kısmına `drive.google.com` ve `googleusercontent.com` domainlerini ekle.
3. Kodda kullanılmayan importları temizle ve TypeScript hatalarını gider.
💡 Mimar Olarak Ekstra Tavsiyelerim (Senin İçin):
Çevre Değişkenleri (.env): Bu adımlara başlamadan önce Google Cloud Console'dan bir Service Account oluşturup JSON key'i indirmeyi ve .env.local dosyana şu değişkenleri eklemeyi unutma:
code
Env
GOOGLE_DRIVE_CLIENT_EMAIL="senin-service-account@proje.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID="drive-klasor-id-buraya"
Vercel Limitleri: Vercel'in Serverless fonksiyonlarında 4.5MB request body limiti vardır. Eğer çok büyük PDF'ler (10MB+) yükleyecekseniz, Adım 4 ve 5'teki mimariyi önce Supabase Storage'a yükle -> AI oradan okusun -> Drive'a aktar şeklinde revize etmemiz gerekebilir. Ancak standart fatura/sözleşmeler (1-2 MB) için memory buffer (yukarıdaki mimari) en hızlı ve masrafsız yoldur.