# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-portal.spec.ts >> Customer Portal & Payment Flows >> 4. Stripe Checkout creates a session and handles payment initiation
- Location: tests\e2e\customer-portal.spec.ts:93:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/de/portal/siparisler/yeni", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - region "Notifications alt+T"
  - generic [ref=f2e4]:
    - link "ElysonSweets" [ref=f2e6] [cursor=pointer]:
      - /url: /admin/dashboard
    - navigation [ref=f2e7]:
      - generic [ref=f2e8]:
        - button "Ana Menü" [ref=f2e9] [cursor=pointer]
        - generic [ref=f2e14]:
          - link "Kontrol Paneli" [ref=f2e15] [cursor=pointer]:
            - /url: /admin/dashboard
          - link "Profil Atamaları" [ref=f2e22] [cursor=pointer]:
            - /url: /admin/idari/personel
      - generic [ref=f2e27]:
        - button "CRM & Müşteri Yönetimi" [ref=f2e28] [cursor=pointer]
        - generic [ref=f2e32]:
          - link "Müşteriler" [ref=f2e33] [cursor=pointer]:
            - /url: /admin/crm/firmalar
          - link "Alt Bayiler" [ref=f2e40] [cursor=pointer]:
            - /url: /admin/crm/alt-bayiler
          - link "Gelen Mesajlar" [ref=f2e46] [cursor=pointer]:
            - /url: /admin/crm/mesajlar
      - generic [ref=f2e51]:
        - button "Operasyon" [ref=f2e52] [cursor=pointer]
        - generic [ref=f2e56]:
          - link "Siparişler" [ref=f2e57] [cursor=pointer]:
            - /url: /admin/operasyon/siparisler
          - link "Numune Talepleri" [ref=f2e64] [cursor=pointer]:
            - /url: /admin/operasyon/numune-talepleri
          - link "Görevler" [ref=f2e68] [cursor=pointer]:
            - /url: /admin/gorevler
          - link "Referanslar & İrtibatlar" [ref=f2e73] [cursor=pointer]:
            - /url: /admin/operasyon/referanslar
      - generic [ref=f2e78]:
        - button "Belge Yönetimi" [ref=f2e79] [cursor=pointer]
        - link "Belge Yönetimi" [ref=f2e84] [cursor=pointer]:
          - /url: /admin/belgeleri-yonet
      - generic [ref=f2e88]:
        - button "Ürün Yönetimi" [ref=f2e89] [cursor=pointer]
        - generic [ref=f2e93]:
          - link "Ürünler" [ref=f2e94] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/urunler
          - link "Ürün Talepleri" [ref=f2e99] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/urun-talepleri
          - link "Kategoriler" [ref=f2e106] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/kategoriler
          - link "Tedarikçi Sipariş Planı" [ref=f2e112] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/tedarikci-siparis-plani
          - link "Değerlendirmeler" [ref=f2e117] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/degerlendirmeler
      - generic [ref=f2e121]:
        - button "Fiyatlandırma" [ref=f2e122] [cursor=pointer]
        - generic [ref=f2e126]:
          - link "Fiyatlandırma Hub" [ref=f2e127] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/fiyatlandirma-hub
          - link "Kârlılık & Varyans Raporu" [ref=f2e131] [cursor=pointer]:
            - /url: /admin/urun-yonetimi/karlilik-raporu
      - generic [ref=f2e134]:
        - button "Pazarlama" [ref=f2e135] [cursor=pointer]
        - generic [ref=f2e139]:
          - link "Duyurular" [ref=f2e140] [cursor=pointer]:
            - /url: /admin/pazarlama/duyurular
          - link "Google İşletme" [ref=f2e146] [cursor=pointer]:
            - /url: /admin/pazarlama/google-isletme
          - link "Blog Yazıları" [ref=f2e150] [cursor=pointer]:
            - /url: /admin/pazarlama/blog
          - link "Reçete Yönetimi" [ref=f2e155] [cursor=pointer]:
            - /url: /admin/pazarlama/receteler
      - generic [ref=f2e160]:
        - button "Mali İşler" [ref=f2e161] [cursor=pointer]
        - generic [ref=f2e165]:
          - link "Giderler" [ref=f2e166] [cursor=pointer]:
            - /url: /admin/idari/finans/giderler
          - link "Ortak Hesapları" [ref=f2e170] [cursor=pointer]:
            - /url: /admin/idari/finans/ortaklar
          - link "Raporlama" [ref=f2e175] [cursor=pointer]:
            - /url: /admin/idari/finans/raporlama
          - link "Kasa İşlemleri" [ref=f2e178] [cursor=pointer]:
            - /url: /admin/idari/finans/kasa
      - generic [ref=f2e182]:
        - button "Yapay Zeka" [ref=f2e183] [cursor=pointer]
        - generic [ref=f2e187]:
          - link "Yönetim Kurulu" [ref=f2e188] [cursor=pointer]:
            - /url: /admin/boardroom
          - link "Tüm Loglar" [ref=f2e195] [cursor=pointer]:
            - /url: /admin/ai-logs
      - generic [ref=f2e200]:
        - button "Ayarlar" [ref=f2e201] [cursor=pointer]
        - generic [ref=f2e205]:
          - link "Profil" [ref=f2e206] [cursor=pointer]:
            - /url: /admin/profil
          - link "Şirket Kasası" [ref=f2e211] [cursor=pointer]:
            - /url: /admin/ayarlar/sirket-kasasi
  - generic [ref=f2e216]:
    - banner [ref=f2e217]:
      - link "ElysonSweets Admin" [ref=f2e219] [cursor=pointer]:
        - /url: /tr/admin/dashboard
      - generic [ref=f2e220]:
        - button "Benachrichtigungen" [ref=f2e222] [cursor=pointer]
        - generic [ref=f2e226]: celen00683@gmail.com
        - button "Çıkış Yap" [ref=f2e231] [cursor=pointer]
    - main [ref=f2e236]
```