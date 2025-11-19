"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SampleCartItem = {
  product_id: string;
  name: string;
  slug?: string;
  image_url?: string;
  quantity: number;
};

type LeadGateContextType = {
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
  unlocked: 'lead_unlocked_v1',
  waitlistId: 'lead_waitlist_id_v1',
  cart: 'sample_cart_v1',
  dismissed: 'lead_modal_dismissed_v1',
};

export function LeadGateProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlockedState] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [cart, setCart] = useState<SampleCartItem[]>([]);

  // Load from localStorage
  useEffect(() => {
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
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const setUnlocked = useCallback((u: boolean, id?: string | null) => {
    setUnlockedState(u);
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
    try { localStorage.removeItem(STORAGE_KEYS.dismissed); } catch {}
  }, []);
  const closeLeadModal = useCallback(() => {
    setIsLeadModalOpen(false);
    try { localStorage.setItem(STORAGE_KEYS.dismissed, '1'); } catch {}
  }, []);

  // Soft gate: show once if not dismissed and not unlocked
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEYS.dismissed) === '1';
      if (!unlocked && !dismissed) {
        setTimeout(() => setIsLeadModalOpen(true), 600); // slight delay after page load
      }
    } catch {}
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }), [unlocked, waitlistId, isLeadModalOpen, setUnlocked, cart, addToCart, removeFromCart, updateQty, clearCart]);

  return (
    <LeadGateContext.Provider value={value}>{children}</LeadGateContext.Provider>
  );
}

export function useLeadGate() {
  const ctx = useContext(LeadGateContext);
  if (!ctx) throw new Error('useLeadGate must be used within LeadGateProvider');
  return ctx;
}
