# BAĞLAM (CONTEXT)
Bu görev, Elyson Sweets B2B platformuna kurulan PWA altyapısı üzerine **Web Push Notifications (Anlık Bildirimler)** ve **App Badging (Uygulama İkonu Üzerinde Kırmızı Bildirim Sayısı)** özelliklerinin entegre edilmesini kapsar.

Mevcut sistemde veritabanı seviyesinde bir bildirim altyapısı (`bildirimler` tablosu ve `notificationUtils.ts`) bulunmaktadır. Bu görevde, veritabanına düşen bu bildirimlerin (örn: "Siparişiniz Yola Çıktı") kullanıcının telefonuna gerçek bir mobil uygulama bildirimi olarak düşmesi ve PWA ikonunun üzerinde okunmamış bildirim sayısının (Badge) gösterilmesi sağlanacaktır.

Çalışılacak Dosyalar:
- `package.json`
- `supabase/migrations/[tarih]_create_push_subscriptions.sql` (Yeni)
- `src/app/sw.ts` (Mevcut Service Worker güncellenecek)
- `src/app/api/push/subscribe/route.ts` (Yeni)
- `src/lib/web-push.ts` (Yeni)
- `src/lib/notificationUtils.ts` (Mevcut yapıya push tetikleyicisi eklenecek)
- `src/contexts/PortalContext.tsx` (App Badge API entegrasyonu için)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `web-push` (Sunucu tarafında bildirim göndermek için)
- `@types/web-push` (Geliştirme bağımlılığı)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Bağımlılıkların Kurulması ve VAPID Key Hazırlığı**
  - Terminalde `npm install web-push` ve `npm install -D @types/web-push` komutlarını çalıştır.
  - Geliştiricinin `.env.local` dosyasına eklemesi için `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ve `VAPID_PRIVATE_KEY` değişkenlerini kullanacak bir yapı kur. (Not: IDE bu key'leri üretemez, kodda `webpush.generateVAPIDKeys()` ile bir script veya yorum satırı bırakarak geliştiriciyi yönlendir).

- [ ] **Adım 2: Veritabanı Migration (Push Subscriptions)**
  - `supabase/migrations/` dizininde yeni bir SQL dosyası oluştur.
  - `push_subscriptions` adında bir tablo oluştur. Kolonlar: `id` (UUID), `user_id` (UUID, auth.users referansı), `endpoint` (TEXT), `p256dh` (TEXT), `auth` (TEXT), `created_at` (TIMESTAMPTZ).
  - RLS politikalarını ekle: Kullanıcılar sadece kendi aboneliklerini ekleyebilir/silebilir/okuyabilir. Adminler tümünü okuyabilir.

- [ ] **Adım 3: Service Worker (sw.ts) Güncellemesi**
  - `src/app/sw.ts` dosyasını aç. Serwist konfigürasyonunun altına Web Push event listener'larını ekle.
  - `self.addEventListener('push', ...)`: Gelen push datasını alıp `self.registration.showNotification(title, options)` ile göster.
  - `self.addEventListener('notificationclick', ...)`: Bildirime tıklandığında ilgili URL'yi (örn: sipariş detayı) açacak mantığı kur.

- [ ] **Adım 4: Backend API ve Web-Push Kütüphanesi Entegrasyonu**
  - `src/lib/web-push.ts` oluştur. `web-push` kütüphanesini VAPID key'ler ile konfigüre et. `sendWebPushToUser(userId, payload)` fonksiyonu yaz (Supabase'den kullanıcının aboneliklerini bulup push atacak).
  - `src/app/api/push/subscribe/route.ts` oluştur. Frontend'den gelen abonelik objesini (endpoint, keys) alıp Supabase `push_subscriptions` tablosuna kaydedecek POST endpoint'ini yaz.

- [ ] **Adım 5: Frontend İzin ve Abonelik Mantığı (Client-Side)**
  - `src/components/portal/PushNotificationManager.tsx` (veya uygun bir hook) oluştur.
  - Kullanıcı giriş yaptığında `Notification.requestPermission()` ile izin iste.
  - İzin verilirse `serviceWorkerRegistration.pushManager.subscribe()` ile abonelik oluştur ve `/api/push/subscribe` endpoint'ine gönder.

- [ ] **Adım 6: App Badge API (Kırmızı Bildirim Sayısı) Entegrasyonu**
  - `src/contexts/PortalContext.tsx` dosyasını aç.
  - `unreadNotificationCount` state'i değiştiğinde çalışan bir `useEffect` yaz.
  - İçerisinde `navigator.setAppBadge` ve `navigator.clearAppBadge` API'lerini kullanarak PWA ikonundaki kırmızı sayıyı güncelle. (Örn: `if ('setAppBadge' in navigator) { navigator.setAppBadge(unreadNotificationCount); }`).

- [ ] **Adım 7: Mevcut Bildirim Sistemine Push Tetikleyicisi Eklenmesi**
  - `src/lib/notificationUtils.ts` içindeki `sendNotification` fonksiyonunu bul.
  - Veritabanına bildirim eklendikten hemen sonra (başarılı olursa), `sendWebPushToUser` fonksiyonunu çağırarak anlık mobil bildirimi tetikle.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **iOS KISITLAMALARI (ÖNEMLİ):** iOS cihazlarda Web Push Notifications SADECE uygulama "Ana Ekrana Ekle" (Add to Home Screen) ile yüklendiyse çalışır. Frontend kodunda `Notification.requestPermission` çağırırken `window.navigator.standalone` veya PWA display mode kontrollerini yaparak, Safari'de normal sekmede gezen kullanıcıya gereksiz hata fırlatma.
- **APP BADGE API DESTEĞİ:** `navigator.setAppBadge` her tarayıcıda desteklenmez. Kodu KESİNLİKLE `if ('setAppBadge' in navigator)` kontrolü içine alarak yaz, aksi takdirde uygulama çöker.
- **GÜVENLİK:** `VAPID_PRIVATE_KEY` kesinlikle frontend'e sızmamalıdır. Sadece `NEXT_PUBLIC_VAPID_PUBLIC_KEY` client tarafında kullanılabilir.
- **PERFORMANS:** Push bildirimi gönderme işlemi (`sendWebPushToUser`), ana sipariş veya veritabanı kayıt akışını (thread) bloklamamalıdır. Hata verse bile (örn: kullanıcının aboneliği düşmüşse) ana işlem (siparişin onaylanması vb.) başarılı sayılmalı, push hatası sadece konsola loglanmalıdır (Fire-and-forget prensibi).