"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import LeadGateModal from '@/components/lead/LeadGateModal';
import FloatingSampleCart from '@/components/lead/FloatingSampleCart';

export type SampleCartItem = {
  product_id: string;
  name: string;
  slug?: string;
  image_url?: string;
  quantity: number;
};

type LeadGateContextType = {
  mounted: boolean;
  unlocked: boolean;
  waitlistId: string | null;
  openLeadModal: () => void;
  closeLeadModal: () => void;
  isLeadModalOpen: boolean;
  setUnlocked: (u: boolean, id?: string | null) => void;
  // cart
  cart: SampleCartItem[];
  addToCart: (item: Omit<SampleCartItem, 'quantity'>, qty?: number) => void;
  removeFromCart: (product_id: string) => void;
  updateQty: (product_id: string, qty: number) => void;
  clearCart: () => void;
};

const LeadGateContext = createContext<LeadGateContextType | undefined>(undefined);

const STORAGE_KEYS = {
  unlocked: 'lead_unlocked_v2',
  waitlistId: 'lead_waitlist_id_v2',
  cart: 'sample_cart_v2',
  dismissed: 'lead_modal_dismissed_v2',
};

export function LeadGateProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [unlocked, setUnlockedState] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [cart, setCart] = useState<SampleCartItem[]>([]);

  // Load from localStorage only on client
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    try {
      const u = localStorage.getItem(STORAGE_KEYS.unlocked);
      const wid = localStorage.getItem(STORAGE_KEYS.waitlistId);
      const cartRaw = localStorage.getItem(STORAGE_KEYS.cart);
      if (u === '1') setUnlockedState(true);
      if (wid) setWaitlistId(wid);
      if (cartRaw) setCart(JSON.parse(cartRaw));
    } catch {}
  }, []);

  // Persist cart
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {}
  }, [cart, mounted]);

  const setUnlocked = useCallback((u: boolean, id?: string | null) => {
    setUnlockedState(u);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.unlocked, u ? '1' : '0');
      if (typeof id !== 'undefined') {
        setWaitlistId(id);
        if (id) localStorage.setItem(STORAGE_KEYS.waitlistId, id);
        else localStorage.removeItem(STORAGE_KEYS.waitlistId);
      }
    } catch {}
  }, []);

  const openLeadModal = useCallback(() => {
    setIsLeadModalOpen(true);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEYS.dismissed); } catch {}
    }
  }, []);
  const closeLeadModal = useCallback(() => {
    setIsLeadModalOpen(false);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEYS.dismissed, '1'); } catch {}
    }
  }, []);

  // Soft gate: show once if not dismissed and not unlocked
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.dismissed) === '1';
      const unlockedValue = localStorage.getItem(STORAGE_KEYS.unlocked);
      
      console.log('🔍 Lead Gate Check:', {
        mounted,
        unlocked,
        unlockedValue,
        dismissed,
        willShow: !unlocked && !dismissed
      });
      
      if (!unlocked && !dismissed) {
        console.log('✅ Opening lead modal in 600ms...');
        setTimeout(() => setIsLeadModalOpen(true), 600);
      } else {
        console.log('❌ Lead modal will NOT open:', { unlocked, dismissed });
      }
    } catch (err) {
      console.error('Lead gate error:', err);
    }
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const addToCart = useCallback((item: Omit<SampleCartItem, 'quantity'>, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(p => p.product_id === item.product_id);
      if (existing) {
        return prev.map(p => p.product_id === item.product_id ? { ...p, quantity: Math.max(1, p.quantity + qty) } : p);
      }
      return [...prev, { ...item, quantity: Math.max(1, qty) }];
    });
  }, []);

  const removeFromCart = useCallback((product_id: string) => {
    setCart(prev => prev.filter(p => p.product_id !== product_id));
  }, []);

  const updateQty = useCallback((product_id: string, qty: number) => {
    setCart(prev => prev.map(p => p.product_id === product_id ? { ...p, quantity: Math.max(1, qty) } : p));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo<LeadGateContextType>(() => ({
    mounted,
    unlocked,
    waitlistId,
    openLeadModal,
    closeLeadModal,
    isLeadModalOpen,
    setUnlocked,
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
  }), [mounted, unlocked, waitlistId, isLeadModalOpen, setUnlocked, cart, addToCart, removeFromCart, updateQty, clearCart, openLeadModal, closeLeadModal]);

  return (
    <LeadGateContext.Provider value={value}>
      {children}
      <LeadGateModal />
      <FloatingSampleCart />
    </LeadGateContext.Provider>
  );
}

export function useLeadGate() {
  const ctx = useContext(LeadGateContext);
  if (!ctx) throw new Error('useLeadGate must be used within LeadGateProvider');
  return ctx;
}
