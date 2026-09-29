import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PortalProvider, usePortal } from '../PortalContext';
import { hesaplaSepetSatiri } from '@/lib/pricingUtils';
import React from 'react';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

describe('PortalContext & PricingUtils', () => {
  const dummyProfile = {} as any;
  const dummyFirma = {} as any;
  const dummyNotifications = [] as any;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PortalProvider value={{
      profile: dummyProfile,
      firma: dummyFirma,
      initialNotifications: dummyNotifications,
      unreadNotificationCount: 0
    } as any}>
      {children}
    </PortalProvider>
  );

  describe('addToWarenkorb Stok Sınırı Testi', () => {
    it('stok miktarından fazla ürün eklenmesini engellemeli', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      const mockUrun = {
        id: '1',
        stok_miktari: 10,
      } as any;

      act(() => {
        // Stoğun üzerinde bir miktar eklemeye çalış (örneğin 15)
        result.current.addToWarenkorb(mockUrun, 15, 'koli');
      });

      // Sepetteki miktarın stok sınırına (10) eşitlendiğini doğrula
      expect(result.current.warenkorb[0].menge).toBe(10);
      expect(result.current.warenkorb[0].birim).toBe('koli');
    });

    it('sepette var olan ürüne stok miktarını aşacak şekilde ekleme yapmayı engellemeli', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      const mockUrun = {
        id: '2',
        stok_miktari: 20,
      } as any;

      act(() => {
        result.current.addToWarenkorb(mockUrun, 15, 'koli');
      });
      
      act(() => {
        // Zaten 15 var, 10 daha eklemek 25 yapar (sınır 20)
        result.current.addToWarenkorb(mockUrun, 10, 'koli');
      });

      // Sepetteki miktarın stok sınırına (20) eşitlendiğini doğrula
      expect(result.current.warenkorb[0].menge).toBe(20);
    });
  });

  describe('Fiyat Hesaplama (Tier Pricing) Testi', () => {
    it('kademe bazlı fiyat hesaplamalarını doğru yapmalı (1-4 koli, 5+ koli, palet)', () => {
      const urun = {
        koli_ici_adet: 10,
        palet_ici_koli_adet: 50,
        satis_fiyati_musteri: 5.00, // 1-4 koli 
        satis_fiyati_toptanci: 4.50, // 5+ koli
        satis_fiyati_palet: 4.00, // Palet
      };

      // 1. Durum: Standart Müşteri (1-4 Koli)
      const hesapMusteri = hesaplaSepetSatiri(urun, 'koli', 3);
      expect(hesapMusteri.adetFiyat).toBe(5.00);
      expect(hesapMusteri.toplamAdet).toBe(30);
      expect(hesapMusteri.toplamFiyat).toBe(150.00);
      expect(hesapMusteri.kademe).toBe('musteri');

      // 2. Durum: Toptancı (5+ Koli)
      const hesapToptanci = hesaplaSepetSatiri(urun, 'koli', 5);
      expect(hesapToptanci.adetFiyat).toBe(4.50);
      expect(hesapToptanci.toplamAdet).toBe(50);
      expect(hesapToptanci.toplamFiyat).toBe(225.00); // 50 adet * 4.50
      expect(hesapToptanci.kademe).toBe('toptanci');

      // 3. Durum: Palet (50 koli, palet seçimi)
      const hesapPalet = hesaplaSepetSatiri(urun, 'palet', 1);
      expect(hesapPalet.adetFiyat).toBe(4.00);
      expect(hesapPalet.toplamAdet).toBe(500); // 1 palet = 50 koli = 500 adet
      expect(hesapPalet.toplamFiyat).toBe(2000.00); // 500 adet * 4.00
      expect(hesapPalet.kademe).toBe('palet');
    });
  });
});
