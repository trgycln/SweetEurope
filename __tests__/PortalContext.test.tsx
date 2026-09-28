import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { PortalProvider, usePortal, ProduktImWarenkorb } from '../src/contexts/PortalContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PortalContext', () => {
  const dummyValue = {
    profile: {} as any,
    firma: {} as any,
    initialNotifications: [],
    unreadNotificationCount: 0,
  };

  const mockProduct: ProduktImWarenkorb = {
    id: 'prod-1',
    urun_adi_tr: 'Test Ürün',
    stok_miktari: 5,
    partnerPreis: null,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PortalProvider value={dummyValue}>{children}</PortalProvider>
  );

  describe('addToWarenkorb', () => {
    it('should add item within stock limit', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      act(() => {
        result.current.addToWarenkorb(mockProduct, 3, 'koli');
      });

      expect(result.current.warenkorb).toHaveLength(1);
      expect(result.current.warenkorb[0].menge).toBe(3);
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it('should limit quantity and show toast when adding more than stock', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      act(() => {
        result.current.addToWarenkorb(mockProduct, 10, 'koli');
      });

      expect(result.current.warenkorb).toHaveLength(1);
      expect(result.current.warenkorb[0].menge).toBe(5);
      expect(toast.warning).toHaveBeenCalled();
    });

    it('should limit quantity and show toast when total in cart exceeds stock', () => {
        const { result } = renderHook(() => usePortal(), { wrapper });
  
        act(() => {
          result.current.addToWarenkorb(mockProduct, 3, 'koli');
        });

        act(() => {
            result.current.addToWarenkorb(mockProduct, 4, 'koli');
        });
  
        expect(result.current.warenkorb).toHaveLength(1);
        expect(result.current.warenkorb[0].menge).toBe(5);
        expect(toast.warning).toHaveBeenCalled();
    });
  });

  describe('updateWarenkorbMenge', () => {
    it('should update quantity within stock limit', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      act(() => {
        result.current.addToWarenkorb(mockProduct, 2, 'koli');
      });

      act(() => {
        result.current.updateWarenkorbMenge(mockProduct.id, 4);
      });

      expect(result.current.warenkorb[0].menge).toBe(4);
    });

    it('should limit quantity and show toast when updating to more than stock', () => {
      const { result } = renderHook(() => usePortal(), { wrapper });

      act(() => {
        result.current.addToWarenkorb(mockProduct, 2, 'koli');
      });

      act(() => {
        result.current.updateWarenkorbMenge(mockProduct.id, 10);
      });

      expect(result.current.warenkorb[0].menge).toBe(5);
      expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Nicht genügend Lagerbestand'));
    });
  });
});
