# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Happy Path (Sorunsuz Akış) E2E testlerinin başarıyla tamamlanması ve sistemin ana omurgasının (Sipariş -> Fatura -> Kargo -> Müşteri Portalı) çalıştığının kanıtlanması üzerine, bu test planı sistemin **Dayanıklılık (Resilience), Güvenlik (Security) ve Sınır Durumları (Edge Cases)** testlerini otomatize etmek için hazırlanmıştır.

**Kapsanan Modüller:**
- **Stok Yönetimi:** Yetersiz stok durumunda sepetin davranışı.
- **Yetkilendirme (RBAC):** Müşteri rolündeki bir kullanıcının Admin paneline erişim denemeleri.
- **Finansal Hesaplamalar:** JavaScript floating-point (küsurat) hatalarına karşı sepet ve fatura tutarlarının kuruş hassasiyetinde doğrulanması.
- **Mock Güvenliği:** `client.ts` içine eklenen Lexware mock mantığının canlı ortama (Production) sızmasının engellenmesi.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Test Türü:** Uçtan Uca (E2E) Negatif ve Sınır Durum Testleri.
- **Araç:** Playwright.
- **Dosya Yapısı:** Happy Path testini şişirmemek adına, bu testler `tests/e2e/order-negative-cases.spec.ts` adında yeni bir dosyada yazılacaktır.
- **Güvenlik Stratejisi:** `client.ts` dosyasında yapılan Lexware mock işleminin KESİNLİKLE `process.env.NODE_ENV === 'production'` durumunda devre dışı kaldığı statik kod analizi ile doğrulanacaktır.

---

# TEST SENARYOLARI (TEST CASES)

### 1. Negative Path: Stok Sınırı İhlali (Out of Stock Prevention)
- Müşteri portala giriş yapar.
- Katalogdan stoğu az olan bir ürün (örn: stok_miktari = 2) bulunur.
- Kullanıcı sepete bu üründen 5 adet eklemeye çalışır.
- *Beklenti:* Sistem (PortalContext) bu işleme izin vermemeli, "Stok yetersiz" uyarısı (toast) göstermeli ve sepetteki miktarı otomatik olarak maksimum stok miktarına (2) eşitlemelidir.

### 2. Negative Path: Yetkisiz Erişim (Unauthorized Access / RBAC)
- Müşteri (`test_e2e_dryrun@elysonsweets.de`) portala giriş yapar.
- Tarayıcı adres çubuğuna manuel olarak `/tr/admin/operasyon/siparisler` veya `/tr/admin/dashboard` yazılır ve gidilir.
- *Beklenti:* Middleware veya sayfa koruması devreye girmeli, kullanıcıyı 403 Forbidden sayfasına, `/tr/login` sayfasına veya kendi yetki alanı olan `/tr/portal/dashboard` sayfasına geri yönlendirmelidir. Admin UI kesinlikle render edilmemelidir.

### 3. Edge Case: Küsurat Hassasiyeti (Floating-Point Precision)
- Müşteri, birim fiyatı küsuratlı olan (örn: 12.99 €) bir üründen 3 adet sepete ekler.
- *Beklenti:* Ara toplam (38.97 €), KDV (%7) ve Kargo ücreti eklendikten sonra çıkan Genel Toplam (Brüt) değerinde `38.970000000000006` gibi JavaScript yuvarlama hataları OLMAMALIDIR. Ekranda ve veritabanına giden payload'da tam olarak 2 ondalık basamak (örn: `XX.XX €`) görünmelidir.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Mock Güvenlik Kontrolü (Code Review)**
  - `src/lib/lexware/client.ts` (veya mock'u eklediğin dosya) dosyasını aç.
  - Lexware API mock mantığının `if (process.env.NODE_ENV !== 'production')` veya benzeri kesin bir çevre değişkeni kontrolü içinde olduğundan emin ol. Canlıda sahte fatura üretilmesi şirket için kritik bir finansal risktir.

- [ ] **Adım 2: Negatif Test Dosyasının Oluşturulması**
  - `tests/e2e/order-negative-cases.spec.ts` dosyasını oluştur.
  - `setup.ts` ile oluşturulan test kullanıcısını kullanarak login olma `beforeEach` bloğunu yaz.

- [ ] **Adım 3: Stok Sınırı Testinin Yazılması**
  - Test içinde, veritabanında stoğu 2 olan bir test ürünü bul (veya test başında stoğu 2 olarak güncelle).
  - UI üzerinden bu üründen 5 adet eklemeyi dene.
  - Ekranda `toast.warning` çıktığını ve sepet ikonunda/çekmecesinde miktarın "2" olarak kaldığını `expect` ile doğrula.

- [ ] **Adım 4: Yetkisiz Erişim Testinin Yazılması**
  - Müşteri oturumu açıkken `page.goto('/tr/admin/operasyon/siparisler')` komutunu çalıştır.
  - Sayfanın URL'sinin `/admin` İÇERMEDİĞİNİ (`expect(page.url()).not.toContain('/admin')`) doğrula.

- [ ] **Adım 5: Küsurat Testinin Yazılması**
  - Sepete küsuratlı ürünler ekle.
  - Sepet çekmecesindeki "Genel Toplam" metnini al.
  - Metnin Regex ile `^\d+\.\d{2} €$` (veya `^\d+,\d{2} €$`) formatına tam uyduğunu, virgülden sonra 3 veya daha fazla rakam olmadığını doğrula.

- [ ] **Adım 6: Testlerin Koşulması ve Onarım**
  - `npx playwright test tests/e2e/order-negative-cases.spec.ts` komutunu çalıştır.
  - Eğer müşteri admin paneline girebiliyorsa `middleware.ts` dosyasını düzelt.
  - Eğer küsurat hatası varsa `pricingUtils.ts` içindeki hesaplamalara `Math.round(val * 100) / 100` veya `toFixed(2)` mantığını uygula.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **MOCK SIZINTISI (CRITICAL):** Test ortamı için yazılan hiçbir "Bypass" veya "Mock" kodu, Production build'inde aktif olmamalıdır. Bu durum tespit edilirse derhal `process.env` kontrolleri ile izole edilmelidir.
2. **BAĞIMSIZ TESTLER:** `order-negative-cases.spec.ts` dosyası, `order-fulfillment.spec.ts` dosyasından tamamen bağımsız çalışabilmelidir. Testler birbirinin state'ini (sepet durumu vb.) etkilememelidir.
3. **MIDDLEWARE GÜVENLİĞİ:** RBAC (Role Based Access Control) testinde sadece UI gizlemesi değil, doğrudan URL üzerinden yapılan erişimlerin (Direct Navigation) engellendiği test edilmelidir.