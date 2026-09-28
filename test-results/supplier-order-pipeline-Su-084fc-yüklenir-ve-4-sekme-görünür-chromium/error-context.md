# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: supplier-order-pipeline.spec.ts >> Supply Chain Pipeline — UI E2E Testleri >> Yeni sipariş sayfası yüklenir ve 4 sekme görünür
- Location: tests\e2e\supplier-order-pipeline.spec.ts:58:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Sipariş")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button:has-text("Sipariş")').first()

```

```yaml
- heading "ElysonSweets" [level=1]
- paragraph: Yönetim Paneline Hoş Geldiniz
- text: E-posta Adresi
- textbox "E-posta Adresi":
  - /placeholder: admin@example.com
- text: Parola
- textbox "Parola":
  - /placeholder: ••••••••
- checkbox "Oturumu açık tut" [checked]
- text: Oturumu açık tut
- link "Parolanızı mı unuttunuz?":
  - /url: /tr/auth/reset-password
- button "Giriş Yap"
- paragraph: Henüz ortağımız değil misiniz?
- link "Şimdi Ortak Olun":
  - /url: /de/register
  - text: Şimdi Ortak Olun
  - img
- link "Web Sitesine Dön":
  - /url: /
  - img
  - text: Web Sitesine Dön
- alert
- heading "Çerezleri kullanıyoruz" [level=3]
- paragraph:
  - text: Web sitemizin düzgün çalışmasını sağlamak, içerikleri ve reklamları kişiselleştirmek, sosyal medya özellikleri sunmak ve trafiğimizi analiz etmek için çerezler ve benzeri teknolojiler kullanıyoruz.
  - link "Gizlilik Politikası":
    - /url: /tr/datenschutz
- button "Sadece zorunlu"
- button "Tümünü kabul et"
```