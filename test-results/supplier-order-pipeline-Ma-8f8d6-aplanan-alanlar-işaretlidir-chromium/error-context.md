# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: supplier-order-pipeline.spec.ts >> Master Data Driven — UI Read-Only Doğrulama >> Tablo başlığında ⚙️ otomatik hesaplanan alanlar işaretlidir
- Location: tests\e2e\supplier-order-pipeline.spec.ts:214:7

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 2
Received:    0
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e4]:
    - generic [ref=f1e5]:
      - heading "ElysonSweets" [level=1] [ref=f1e6]
      - paragraph [ref=f1e7]: Yönetim Paneline Hoş Geldiniz
    - generic [ref=f1e8]:
      - generic [ref=f1e9]:
        - generic [ref=f1e10]: E-posta Adresi
        - textbox "E-posta Adresi" [ref=f1e11]:
          - /placeholder: admin@example.com
      - generic [ref=f1e12]:
        - generic [ref=f1e13]: Parola
        - textbox "Parola" [ref=f1e14]:
          - /placeholder: ••••••••
      - generic [ref=f1e15]:
        - generic [ref=f1e16]:
          - checkbox "Oturumu açık tut" [checked] [ref=f1e17]
          - generic [ref=f1e18]: Oturumu açık tut
        - link "Parolanızı mı unuttunuz?" [ref=f1e20] [cursor=pointer]:
          - /url: /tr/auth/reset-password
      - button "Giriş Yap" [ref=f1e22] [cursor=pointer]
    - generic [ref=f1e23]:
      - paragraph [ref=f1e24]: Henüz ortağımız değil misiniz?
      - link "Şimdi Ortak Olun" [ref=f1e25] [cursor=pointer]:
        - /url: /de/register
    - link "Web Sitesine Dön" [ref=f1e29] [cursor=pointer]:
      - /url: /
  - button "Open Next.js Dev Tools" [ref=f1e37] [cursor=pointer]
  - alert [ref=f1e41]
  - generic [ref=f1e43]:
    - generic [ref=f1e44]:
      - heading "Çerezleri kullanıyoruz" [level=3] [ref=f1e45]
      - paragraph [ref=f1e46]:
        - text: Web sitemizin düzgün çalışmasını sağlamak, içerikleri ve reklamları kişiselleştirmek, sosyal medya özellikleri sunmak ve trafiğimizi analiz etmek için çerezler ve benzeri teknolojiler kullanıyoruz.
        - link "Gizlilik Politikası" [ref=f1e47] [cursor=pointer]:
          - /url: /tr/datenschutz
    - generic [ref=f1e48]:
      - button "Sadece zorunlu" [ref=f1e49] [cursor=pointer]
      - button "Tümünü kabul et" [ref=f1e50] [cursor=pointer]
```