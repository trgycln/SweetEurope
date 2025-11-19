"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useLeadGate } from '@/contexts/LeadGateContext';
import { submitWaitlistForm } from '@/app/actions/waitlist';
import { useParams } from 'next/navigation';

export default function LeadGateModal() {
  const { isLeadModalOpen, closeLeadModal, setUnlocked } = useLeadGate();
  const params = useParams();
  const locale = (params?.locale as string) || 'de';
  const [firma_adi, setFirma] = useState('');
  const [yetkili_kisi, setYetkili] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  const t = {
    title: {
      de: 'Kostenloses Probierpaket anfordern',
      tr: 'Ücretsiz Numune Paketi Talep Edin',
      en: 'Request Free Sample Pack',
      ar: 'طلب عينة مجانية'
    },
    firma: { de: 'Firma', tr: 'Firma Adı', en: 'Company', ar: 'شركة' },
    yetkili: { de: 'Ansprechpartner', tr: 'Yetkili Kişi', en: 'Contact Person', ar: 'الشخص المسؤول' },
    email: { de: 'E-Mail', tr: 'E-posta', en: 'Email', ar: 'البريد الإلكتروني' },
    telefon: { de: 'Telefon (optional)', tr: 'Telefon (opsiyonel)', en: 'Phone (optional)', ar: 'الهاتف (اختياري)' },
    later: { de: 'Später', tr: 'Daha Sonra', en: 'Later', ar: 'لاحقاً' },
    submit: { de: 'Senden und Fortfahren', tr: 'Gönder ve Devam Et', en: 'Submit and Continue', ar: 'إرسال ومتابعة' },
    sending: { de: 'Wird gesendet…', tr: 'Gönderiliyor…', en: 'Sending…', ar: 'جاري الإرسال…' },
    successTitle: { de: 'Freigeschaltet!', tr: 'Başarıyla Açıldı!', en: 'Unlocked!', ar: 'تم فتح الوصول!' },
    successBody: {
      de: 'Sie können jetzt Musterprodukte auswählen.',
      tr: 'Artık numune ürünleri ekleyebilirsiniz.',
      en: 'You can now add sample products.',
      ar: 'يمكنك الآن إضافة منتجات العينة.'
    },
    closingIn: { de: 'Schließt automatisch…', tr: 'Otomatik kapanacak…', en: 'Closing automatically…', ar: 'سيُغلق تلقائياً قريباً…' }
  };

  useEffect(()=>{
    return () => { if (autoCloseTimer) clearTimeout(autoCloseTimer); };
  }, [autoCloseTimer]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitWaitlistForm({ firma_adi, yetkili_kisi, email });
      if (!res.success || !res.id) {
        setError(res.message || 'Fehler');
        setLoading(false);
        return;
      }
      setUnlocked(true, res.id);
      setSuccess(true);
      const timer = setTimeout(()=>{ closeLeadModal(); }, 2500);
      setAutoCloseTimer(timer);
    } catch (e: any) {
      setError(e?.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  // Move conditional check AFTER all hooks
  if (!isLeadModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t.title[locale as keyof typeof t.title] || t.title.de}</h3>
          <button onClick={closeLeadModal} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.firma[locale as keyof typeof t.firma] || t.firma.de}</label>
              <input value={firma_adi} onChange={e=>setFirma(e.target.value)} required className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.yetkili[locale as keyof typeof t.yetkili] || t.yetkili.de}</label>
              <input value={yetkili_kisi} onChange={e=>setYetkili(e.target.value)} required className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t.email[locale as keyof typeof t.email] || t.email.de}</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t.telefon[locale as keyof typeof t.telefon] || t.telefon.de}</label>
              <input value={telefon} onChange={e=>setTelefon(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 animate-fadeIn">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm">✓</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-700">{t.successTitle[locale as keyof typeof t.successTitle] || t.successTitle.de}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{t.successBody[locale as keyof typeof t.successBody] || t.successBody.de}</p>
                <p className="text-[10px] text-emerald-500 mt-1">{t.closingIn[locale as keyof typeof t.closingIn] || t.closingIn.de}</p>
              </div>
              <button type="button" onClick={closeLeadModal} className="text-emerald-600 hover:text-emerald-800 text-sm">✕</button>
            </div>
          )}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={closeLeadModal} className="px-4 py-2 rounded-lg border text-gray-700">{t.later[locale as keyof typeof t.later] || t.later.de}</button>
            <button disabled={loading || success} type="submit" className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold disabled:opacity-50">
              {loading ? (t.sending[locale as keyof typeof t.sending] || t.sending.de) : (t.submit[locale as keyof typeof t.submit] || t.submit.de)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
