"use client";

import { useState, useEffect } from 'react';
import { useLeadGate } from '@/contexts/LeadGateContext';
import { submitSampleRequest } from '@/app/actions/sample-requests';
import { useParams } from 'next/navigation';

export default function FloatingSampleCart() {
  const { cart, removeFromCart, clearCart, unlocked, waitlistId, openLeadModal } = useLeadGate();
  const params = useParams();
  const locale = (params?.locale as string) || 'de';
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(()=>{
    if (submitted) {
      const timer = setTimeout(()=> setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  const t = {
    openSamples: { de: 'Mustervorteile freischalten', tr: 'Numune Avantajlarını Aç', en: 'Unlock Sample Benefits', ar: 'فتح مزايا العينات' },
    sampleList: { de: 'Musterliste', tr: 'Numune Listesi', en: 'Sample List', ar: 'قائمة العينات' },
    remove: { de: 'Entfernen', tr: 'Sil', en: 'Remove', ar: 'حذف' },
    notePlaceholder: { de: 'Notiz (optional)', tr: 'Not (opsiyonel)', en: 'Note (optional)', ar: 'ملاحظة (اختياري)' },
    clearList: { de: 'Liste leeren', tr: 'Listeyi Temizle', en: 'Clear List', ar: 'مسح القائمة' },
    submitRequest: { de: 'Musteranfrage senden', tr: 'Numune Talebini Gönder', en: 'Submit Sample Request', ar: 'إرسال طلب العينة' },
    sending: { de: 'Wird gesendet…', tr: 'Gönderiliyor…', en: 'Sending…', ar: 'جاري الإرسال…' },
    successTitle: { de: 'Ihre Musteranfrage wurde erhalten', tr: 'Numune talebiniz alındı', en: 'Your sample request has been received', ar: 'تم استلام طلب العينة الخاص بك' },
    successBody: { de: 'En kısa sürede sizinle iletişime geçeceğiz.', tr: 'En kısa zamanda tarafınızla iletişime geçilecektir.', en: 'We will contact you as soon as possible.', ar: 'سنتواصل معك في أقرب وقت ممكن.' },
    errorMsg: { de: 'Konnte nicht gesendet werden', tr: 'Gönderilemedi', en: 'Could not send', ar: 'لا يمكن الإرسال' },
    products: { de: 'Produkte', tr: 'Ürün', en: 'Products', ar: 'منتجات' }
  };

  const count = cart.length; // Each product is 1 piece

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative px-4 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-xl"
      >
        {t.sampleList[locale as keyof typeof t.sampleList] || t.sampleList.de} ({count} {t.products[locale as keyof typeof t.products] || t.products.de})
      </button>

      {open && (
        <div className="mt-3 w-[360px] rounded-2xl bg-white shadow-2xl border flex flex-col" style={{maxHeight: '75vh'}}>
          <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <h4 className="font-semibold">{t.sampleList[locale as keyof typeof t.sampleList] || t.sampleList.de}</h4>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          
          {/* Action Buttons - Fixed at top */}
          <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={clearCart} 
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {t.clearList[locale as keyof typeof t.clearList] || t.clearList.de}
              </button>
              <button
                disabled={!unlocked || !waitlistId || loading}
                onClick={async ()=>{
                  if (!unlocked || !waitlistId) { openLeadModal(); return; }
                  setLoading(true);
                  try {
                    console.log('Submitting sample request:', { waitlistId, note, items: cart });
                    const res = await submitSampleRequest({
                      waitlist_id: waitlistId,
                      note,
                      items: cart.map(c=>({ product_id: c.product_id, quantity: 1 })),
                    });
                    console.log('Sample request response:', res);
                    if (res.success) {
                          setToast('success');
                          setSubmitted(true);
                          clearCart();
                          setOpen(false);
                          setNote('');
                        } else {
                      console.error('Sample request failed:', res);
                      setToast(res.message || (t.errorMsg[locale as keyof typeof t.errorMsg] || t.errorMsg.de));
                      setTimeout(()=>setToast(null), 3500);
                    }
                  } catch (err) {
                    console.error('Sample request exception:', err);
                    setToast(t.errorMsg[locale as keyof typeof t.errorMsg] || t.errorMsg.de);
                    setTimeout(()=>setToast(null), 3500);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white disabled:opacity-50 font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                {loading ? (t.sending[locale as keyof typeof t.sending] || t.sending.de) : (t.submitRequest[locale as keyof typeof t.submitRequest] || t.submitRequest.de)}
              </button>
            </div>
          </div>

          {/* Scrollable Product List */}
          <div className="p-3 space-y-3 overflow-y-auto flex-1" style={{maxHeight: '45vh'}}>
            {cart.map((it) => (
              <div key={it.product_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt={it.name} className="w-12 h-12 rounded object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 border" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-sm">{it.name}</div>
                  <div className="text-xs text-gray-500">1x {t.products[locale as keyof typeof t.products] || t.products.de}</div>
                </div>
                <button onClick={()=>removeFromCart(it.product_id)} className="text-xs text-red-600 hover:underline font-medium">
                  {t.remove[locale as keyof typeof t.remove] || t.remove.de}
                </button>
              </div>
            ))}
          </div>

          {/* Note Textarea - Fixed at bottom */}
          <div className="px-4 py-3 border-t flex-shrink-0">
            <textarea value={note} onChange={e=>setNote(e.target.value)} 
              placeholder={t.notePlaceholder[locale as keyof typeof t.notePlaceholder] || t.notePlaceholder.de}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
        </div>
      )}

      {/* Centered success overlay */}
      {toast === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-emerald-200 p-6 animate-fadeIn relative">
            <button onClick={()=>{ setToast(null); setSubmitted(false); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold">✓</div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-emerald-700">
                  {t.successTitle[locale as keyof typeof t.successTitle] || t.successTitle.de}
                </h4>
                <p className="text-sm text-emerald-700 mt-1">
                  {t.successBody[locale as keyof typeof t.successBody] || t.successBody.de}
                </p>
                <p className="mt-3 text-[11px] text-emerald-600">
                  {locale === 'tr' ? 'Bu pencere birkaç saniye içinde kapanacak.' : locale === 'de' ? 'Dieses Fenster schließt in wenigen Sekunden.' : locale === 'en' ? 'This window will close in a few seconds.' : 'ستُغلق هذه النافذة خلال ثوانٍ.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && toast !== 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-[360px] bg-white rounded-xl border border-red-200 p-5 shadow-xl">
            <p className="text-sm text-red-700 font-medium">{toast}</p>
            <div className="text-right mt-3">
              <button onClick={()=> setToast(null)} className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
