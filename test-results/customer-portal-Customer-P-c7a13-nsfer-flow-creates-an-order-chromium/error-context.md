# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-portal.spec.ts >> Customer Portal & Payment Flows >> 3. B2B / Auf Rechnung (Bank Transfer) flow creates an order
- Location: tests\e2e\customer-portal.spec.ts:52:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.scrollIntoViewIfNeeded: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: /Auf Rechnung|B2B|Fatura ile/i }).first()

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
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
      - main [ref=f2e236]:
        - generic [ref=f2e238]:
          - generic [ref=f2e240]:
            - generic [ref=f2e241]:
              - heading "CEO Cockpit" [level=1] [ref=f2e242]
              - paragraph [ref=f2e243]: Bu Ay (MTD) · 28 Eylül 2026
            - generic [ref=f2e244]:
              - button "Bu Ay" [ref=f2e245] [cursor=pointer]
              - button "Geçen Ay" [ref=f2e246] [cursor=pointer]
              - button "Bu Yıl (YTD)" [ref=f2e247] [cursor=pointer]
          - generic [ref=f2e249]:
            - link [ref=f2e251] [cursor=pointer]:
              - /url: "#"
              - paragraph [ref=f2e252]: 0 €
              - paragraph [ref=f2e253]: Net Ciro
            - link [ref=f2e255] [cursor=pointer]:
              - /url: "#"
              - paragraph [ref=f2e256]: 0 €
              - paragraph [ref=f2e257]: Brüt Kâr
            - link [ref=f2e259] [cursor=pointer]:
              - /url: "#"
              - paragraph [ref=f2e260]: 20.893 €
              - paragraph [ref=f2e261]: Toplam Gider
            - link [ref=f2e263] [cursor=pointer]:
              - /url: "#"
              - paragraph [ref=f2e264]: "-20.893 €"
              - paragraph [ref=f2e265]: Net Kâr
            - link [ref=f2e267] [cursor=pointer]:
              - /url: /tr/admin/operasyon/siparisler?durum=Teslim Edildi
              - paragraph [ref=f2e268]: "0"
              - paragraph [ref=f2e269]: Teslim Edilen
              - paragraph [ref=f2e270]: Bu Ay (MTD) · gerçekleşen
            - link [ref=f2e272] [cursor=pointer]:
              - /url: /tr/admin/operasyon/siparisler
              - paragraph [ref=f2e273]: "0"
              - paragraph [ref=f2e274]: Aktif Sipariş
              - paragraph [ref=f2e275]: 0 bekl. · 0 hazır · 0 yolda
          - generic [ref=f2e277]:
            - paragraph [ref=f2e278]: Nakit & Sermaye
            - generic [ref=f2e279]:
              - generic [ref=f2e280]:
                - paragraph [ref=f2e281]: Kasada Kalan (Banka + Nakit)
                - paragraph [ref=f2e283]: 30.557,24 €
                - paragraph [ref=f2e284]: Otomatik hesaplanır
              - generic [ref=f2e285]:
                - paragraph [ref=f2e286]: Bu Ay (MTD) Gider
                - paragraph [ref=f2e287]: 20.893 €
                - paragraph [ref=f2e288]: SMM dahil değil
              - generic [ref=f2e289]:
                - paragraph [ref=f2e290]: Depodaki Stok Değeri
                - paragraph [ref=f2e291]: 0 €
                - paragraph [ref=f2e292]: 92 ürün (toplam) · alış fiyatı
          - generic [ref=f2e294]:
            - paragraph [ref=f2e295]: Hızlı İşlemler
            - generic [ref=f2e296]:
              - link [ref=f2e297] [cursor=pointer]:
                - /url: /tr/admin/crm/firmalar/yeni
              - link [ref=f2e304] [cursor=pointer]:
                - /url: /tr/admin/urun-yonetimi/urunler/yeni
              - link [ref=f2e309] [cursor=pointer]:
                - /url: /tr/admin/operasyon/siparisler/yeni
              - link [ref=f2e315] [cursor=pointer]:
                - /url: /tr/admin/idari/finans/giderler
              - link [ref=f2e320] [cursor=pointer]:
                - /url: /tr/admin/idari/finans/kasa
          - generic [ref=f2e325]:
            - paragraph [ref=f2e326]: Yönetim Modülleri
            - generic [ref=f2e328]:
              - button "Finansal Detay" [ref=f2e329] [cursor=pointer]
              - button "10 Görev & Sipariş" [ref=f2e335] [cursor=pointer]:
                - generic [ref=f2e336]: "10"
                - generic [ref=f2e341]: Görev & Sipariş
              - button "Stok & Hunisi" [ref=f2e342] [cursor=pointer]
              - button "Müşteriler" [ref=f2e348] [cursor=pointer]
              - button "Fiyat Sağlığı" [ref=f2e356] [cursor=pointer]
              - button "Fiyat Alarmları" [ref=f2e361] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=f2e372] [cursor=pointer]
  - alert [ref=f2e376]
```