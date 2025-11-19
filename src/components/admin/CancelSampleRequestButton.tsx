"use client";
import { useState } from 'react';

interface Props {
  requestId: string;
  locale: string;
}

const t = {
  title: { tr: 'İptal Et', de: 'Stornieren', en: 'Cancel', ar: 'إلغاء' },
  reasonLabel: { tr: 'İptal Nedeni', de: 'Stornierungsgrund', en: 'Cancellation Reason', ar: 'سبب الإلغاء' },
  reasonPlaceholder: { tr: 'Kısa bir açıklama yazın...', de: 'Kurze Begründung...', en: 'Write a short reason...', ar: 'اكتب سبباً مختصراً...' },
  confirm: { tr: 'Onayla', de: 'Bestätigen', en: 'Confirm', ar: 'تأكيد' },
  cancel: { tr: 'Vazgeç', de: 'Abbrechen', en: 'Dismiss', ar: 'إلغاء' },
  required: { tr: 'Neden zorunlu.', de: 'Grund erforderlich.', en: 'Reason required.', ar: 'السبب مطلوب.' },
  success: { tr: 'İptal edildi', de: 'Storniert', en: 'Cancelled', ar: 'تم الإلغاء' },
  error: { tr: 'İptal başarısız', de: 'Fehler beim Stornieren', en: 'Cancel failed', ar: 'فشل الإلغاء' },
};

export default function CancelSampleRequestButton({ requestId, locale }: Props) {
  const loc = (locale as keyof typeof t.title) || 'tr';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setMsg(t.required[loc]);
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('request_id', requestId);
      form.append('status', 'iptal');
      form.append('cancel_reason', reason.trim());
      const res = await fetch('/api/admin/update-sample-status', { method: 'POST', body: form });
      if (res.redirected) {
        // server sends 303 redirect
        window.location.href = res.url;
        return;
      }
      const json = await res.json();
      if (json.success) {
        setMsg(t.success[loc]);
        setTimeout(()=>window.location.reload(), 800);
      } else {
        setMsg(t.error[loc]);
      }
    } catch (e) {
      setMsg(t.error[loc]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={()=>{ setOpen(true); setMsg(null); }}
        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold text-sm transition-colors"
      >
        ✕ {t.title[loc]}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[380px] bg-white rounded-xl shadow-2xl border p-5 space-y-4">
            <h3 className="font-semibold text-red-700 text-sm">{t.reasonLabel[loc]}</h3>
            <textarea
              value={reason}
              onChange={e=>setReason(e.target.value)}
              placeholder={t.reasonPlaceholder[loc]}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {msg && <div className="text-xs text-red-600 font-medium">{msg}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={()=>{ if(!loading){ setOpen(false); setReason(''); } }}
                className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
              >
                {t.cancel[loc]}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm rounded-md bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold disabled:opacity-50"
              >
                {loading ? '...' : t.confirm[loc]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
