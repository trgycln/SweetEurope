# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Bu belge, `www.elysonsweets.de` projesi için başlatılan Uçtan Uca (E2E) Test, Kalite Güvence (QA) ve Sürekli Entegrasyon (CI/CD) süreçlerinin **başarıyla tamamlandığını** onaylayan resmi "QA Sign-off ve Bakım" yönergesidir. 

Kapsanan ve güvence altına alınan modüller: B2B Sipariş Akışı, Lexware Fatura Entegrasyonu, Kargo Takip Sistemi, Stok Yarış Durumları (Race Conditions), RBAC (Yetkilendirme), Küsurat Hassasiyeti ve Production Smoke Test. Sistem an itibarıyla %100 Production-Ready (Canlıya Çıkmaya Hazır) durumdadır.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Mevcut Durum:** Tüm testler (Happy Path, Negative Path, Edge Cases, Smoke) Playwright ile otomatize edilmiş ve GitHub Actions'a bağlanmıştır.
- **Yeni Strateji (Sürekli İzleme ve Bakım):** Geliştirme fazından "İzleme (Monitoring)" fazına geçiş. GitHub Actions üzerinden gelen hata bildirimlerinin (Alerts) anlık takibi ve Playwright HTML raporlarının analizi.
- **Araçlar:** GitHub Actions, Playwright HTML Reporter, Slack/Discord Webhooks (Hata bildirimleri için).

---

# TEST SENARYOLARI (TEST CASES) - SÜREKLİ İZLEME

### 1. Flaky (Kararsız) Test Yönetimi
- Zamanla ağ gecikmeleri veya 3. parti API (Stripe, Lexware) yavaşlıkları nedeniyle testler ara sıra başarısız olabilir (Flaky).
- *Beklenti:* Playwright'ın `retries: 1` (veya 2) ayarı sayesinde geçici ağ hataları tolere edilmeli, ancak üst üste hata veren testler derhal onarılmalıdır.

### 2. Yeni Özellik (Feature) Geliştirme Senaryosu
- Sisteme yeni bir modül (örn. İade Süreci veya Yeni Ödeme Yöntemi) eklendiğinde.
- *Beklenti:* Mevcut E2E testleri kırılmamalı (Regression Testing). Yeni modül için `tests/e2e/` altına yeni bir `.spec.ts` dosyası eklenmeli ve mevcut akışlar korunmalıdır.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Hata Bildirimlerinin (Alerting) Kurulması**
  - `.github/workflows/synthetic-monitoring.yml` dosyasını aç.
  - `Alert on Failure` adımındaki yorum satırını (`# Slack/Discord webhook curl command could go here`) bul.
  - Şirketin kullandığı iletişim kanalına (Slack/Discord/Teams) ait bir Webhook URL'sini GitHub Secrets'a (`SLACK_WEBHOOK_URL`) ekle ve curl komutunu aktifleştir. Böylece canlı site çökerse anında ekibin telefonuna bildirim gelsin.

- [ ] **Adım 2: Playwright Raporlarının Saklanması (Artifacts)**
  - GitHub Actions her çalıştığında oluşan `playwright-report/` klasörünün 30 gün boyunca saklandığından emin ol (Mevcut `upload-artifact` adımı bunu yapıyor, teyit et).
  - Hata durumunda (Test Fail) GitHub Actions paneline girip bu HTML raporunu indirerek hatanın ekran görüntüsüne (screenshot) ve video kaydına bakılabileceğini ekibe dokümante et.

- [ ] **Adım 3: Bağımlılıkların (Dependencies) Güncel Tutulması**
  - Ayda bir kez `npm outdated` komutu ile `@playwright/test` paketinin güncelliğini kontrol et.
  - Tarayıcı motorlarının (Chromium, WebKit) güncel kalması için `npx playwright install` komutunun CI/CD ortamında her zaman çalıştığından emin ol.

- [ ] **Adım 4: Proje Teslimi ve Kapanış**
  - Tüm test dosyalarının (`order-fulfillment.spec.ts`, `order-negative-cases.spec.ts`, `smoke-production.spec.ts`, `setup.ts`, `teardown.ts`) Git repository'sine commit edilip pushlandığından emin ol.
  - QA sürecini resmi olarak kapat ve canlıya çıkış (Production Launch) için yeşil ışık yak.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **FLAKY TESTLERE SIFIR TOLERANS:** Bir test bazen geçip bazen kalıyorsa (flaky), o test KESİNLİKLE yorum satırına alınmamalıdır (`test.skip`). Sorunun kök nedeni (genelde eksik `await` veya yanlış `waitForSelector`) bulunup çözülmelidir.
2. **TEST KULLANICISI İZOLASYONU:** Canlı veritabanında test koşulması kesinlikle yasaktır. Smoke test haricindeki tüm testler, `setup.ts` ile oluşturulan izole test kullanıcıları üzerinden yürütülmeye devam etmelidir.
3. **GİZLİLİK:** Test raporları (Playwright HTML Report) ekran görüntüleri ve videolar içerdiğinden, bu raporların public (herkese açık) bir sunucuda barındırılmaması, sadece GitHub Actions Artifacts üzerinden yetkili ekibe sunulması zorunludur.