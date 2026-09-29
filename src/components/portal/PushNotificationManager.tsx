'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  // iOS ve Standalone kontrolü
  const checkIsEligibleForPush = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Service Worker ve Push Manager desteği
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return false;
    }

    // iOS kontrolü (Safari)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // iOS'ta Web Push sadece PWA olarak ana ekrana eklenmişse desteklenir (iOS 16.4+)
    if (isIOS && !isStandalone) {
      return false;
    }

    return true;
  }, []);

  const registerSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('[PushNotificationManager] NEXT_PUBLIC_VAPID_PUBLIC_KEY tanımlı değil.');
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Backend'e aboneliği kaydet
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setShowPromptBanner(false);
        return true;
      } else {
        console.error('[PushNotificationManager] Backend kayıt hatası');
        return false;
      }
    } catch (err) {
      console.error('[PushNotificationManager] Abonelik oluşturma hatası:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkIsEligibleForPush()) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
      // Zaten izin verilmişse sessizce aboneliği doğrula / backend'e tazele
      registerSubscription();
    } else if (currentPermission === 'default') {
      // Kullanıcı daha önce dismiss etmediyse prompt banner göster
      const isDismissed = localStorage.getItem('push_prompt_dismissed_until');
      if (!isDismissed || Number(isDismissed) < Date.now()) {
        setShowPromptBanner(true);
      }
    }
  }, [checkIsEligibleForPush, registerSubscription]);

  const handleRequestPermission = async () => {
    if (!isSupported) return;

    try {
      setIsLoading(true);
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const success = await registerSubscription();
        if (success) {
          toast.success('Anlık bildirimler başarıyla etkinleştirildi.');
        } else {
          toast.error('Bildirim aboneliği oluşturulamadı.');
        }
      } else if (result === 'denied') {
        setShowPromptBanner(false);
        toast.info('Bildirim izni reddedildi. Tarayıcı ayarlarından dilediğinizde açabilirsiniz.');
      }
    } catch (err) {
      console.error('[PushNotificationManager] İzin isteme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissBanner = () => {
    setShowPromptBanner(false);
    // 7 gün boyunca tekrar sorma
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('push_prompt_dismissed_until', String(nextWeek));
  };

  if (!isSupported || !showPromptBanner || permission !== 'default') {
    return null;
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-white p-3.5 shadow-sm transition-all dark:bg-zinc-900 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-text-main dark:text-zinc-100">
            Sipariş ve Stok Bildirimlerini Kaçırmayın
          </h4>
          <p className="text-xs text-text-muted dark:text-zinc-400">
            Sipariş durumları ve kritik güncellemeler anlık olarak telefonunuza gelsin.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRequestPermission}
          disabled={isLoading}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? 'Kaydediliyor...' : 'Bildirimleri Aç'}
        </button>
        <button
          onClick={handleDismissBanner}
          title="Daha sonra hatırlat"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
