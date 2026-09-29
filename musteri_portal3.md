- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: Müşteri giriş (Login) ekranına "Şifreyi Göster/Gizle" (Eye Icon) özelliğinin eklenmesi ve E2E testlerindeki performans/zaman aşımı (timeout) sorunlarının çözülerek test sürecinin production (canlı) build üzerinde tamamlanması.
Mevcut Durum: 
1. Müşteriler şifre girerken yazdıklarını göremiyor, bu da UX açısından hatalı girişlere sebep oluyor.
2. IDE, `yarn dev` ve `npm run build` komutlarını aynı anda çalıştırdığı için CPU/RAM darboğazı yaşanmış ve Playwright testleri timeout'a düşmüş.
Kapsam: Login formundaki şifre input'una `lucide-react` ikonları (`Eye`, `EyeOff`) ile toggle özelliği eklenecek. Ardından sistem kaynaklarını tüketmemek adına işlemler sıraya konacak: Önce build tamamlanacak, sonra `npm run start` ile production sunucusu ayağa kaldırılacak ve E2E testleri bu stabil sunucu üzerinde koşulacak.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. UI/UX Geliştirmesi: Login form bileşeninde (örn. `LoginForm.tsx` veya `app/[locale]/(public)/login/page.tsx`) `useState` kullanılarak şifre görünürlüğü kontrol edilecek.
2. Performans ve Test Stratejisi: E2E testleri geliştirme (dev) sunucusunun hantallığından kurtarılıp, optimize edilmiş production build üzerinde çalıştırılacak. Eşzamanlı ağır işlemler (build + test) KESİNLİKLE yapılmayacak.
3. Test Kapsamı Genişletmesi: Playwright testine, şifre göz ikonuna tıklanıp input tipinin `password`'den `text`'e dönüştüğünü doğrulayan küçük bir assertion eklenecek.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Kullanıcı login sayfasına gelir, şifresini yazar.
    - Şifre alanının sağındaki "Göz" ikonuna tıklar.
    - Input `type="password"` niteliği `type="text"` olarak değişir ve şifre görünür olur. İkon `EyeOff` (üstü çizili göz) olarak değişir.
    - Tekrar tıklandığında şifre gizlenir.
    - Login işlemi başarıyla gerçekleşir, katalogdan ürün sepete eklenir, Drawer (Çekmece) açılır ve sipariş tamamlanır.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Göz ikonuna tıklanması formu KESİNLİKLE submit etmemelidir (Buton `type="button"` olmalıdır).
  * Edge Cases (Sınır durumlar):
    - Şifre göster/gizle butonu klavye ile erişilebilir (Tab ile odaklanılabilir) olmalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: Login Bileşeninin Tespiti ve Güncellenmesi. Projedeki müşteri giriş formunu bul (muhtemelen `src/app/[locale]/(public)/login/page.tsx` veya `src/components/auth/...`). 
  - [ ] Adım 2: Şifre Göster/Gizle Mantığının Eklenmesi. İlgili bileşene `const [showPassword, setShowPassword] = useState(false)` ekle. Şifre input'unu kapsayan bir `relative` div oluştur. Input'un `type` özelliğini `showPassword ? 'text' : 'password'` yap. Input'un sağına `absolute right-3 top-1/2 -translate-y-1/2` class'ları ile bir `<button type="button" onClick={() => setShowPassword(!showPassword)}>` ekle. İçerisinde duruma göre `Eye` veya `EyeOff` ikonlarını (lucide-react) göster.
  - [ ] Adım 3: Playwright Testinin Güncellenmesi. `tests/e2e/portal/customer-journey.spec.ts` dosyasını aç. Login adımına şu kontrolü ekle: Şifreyi yazdıktan sonra göz ikonuna tıkla, input'un görünür metin içerdiğini doğrula, tekrar tıkla.
  - [ ] Adım 4: Build İşleminin Beklenmesi ve Hata Kontrolü. Arka planda devam eden `npm run build` işleminin bitmesini bekle. Eğer TypeScript veya ESLint hatası verirse, ÖNCE BU HATALARI ÇÖZ ve tekrar build al.
  - [ ] Adım 5: Production Sunucusunun Başlatılması. Build başarıyla bittikten sonra, terminalde `npm run start` komutunu çalıştırarak projeyi canlı ortam simülasyonunda (genelde port 3000) ayağa kaldır.
  - [ ] Adım 6: E2E Testlerinin Koşulması. Sunucu hazır olduğunda, YENİ BİR TERMİNAL sekmesinde `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştır. (Timeout hatalarını önlemek için build ve test aynı anda çalışmamış olacak).
  - [ ] Adım 7: Sonuç Raporlaması. Testler başarıyla geçerse, sepet çekmecesinin ve şifre göster/gizle butonunun production ortamında kusursuz çalıştığını onayla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - ERİŞİLEBİLİRLİK: Şifre göster/gizle butonuna mutlaka `aria-label="Şifreyi göster/gizle"` ekle.
  - FORM GÜVENLİĞİ: Göz ikonunu saran buton KESİNLİKLE `type="button"` olmalıdır. Aksi takdirde varsayılan olarak `type="submit"` davranışı sergiler ve formu yanlışlıkla gönderir.
  - KAYNAK YÖNETİMİ: `build` işlemi ile `playwright test` işlemini KESİNLİKLE aynı anda çalıştırma. Vercel/Next.js build işlemi çok fazla RAM/CPU tüketir ve testlerin timeout'a düşmesine sebep olur. Sıralı işlem yap.