'use client';

import { useState, useTransition } from 'react';
import { faturaOlusturAction, faturaIptalEtAction } from '@/app/actions/lexware-actions';
import { toast } from 'sonner';
import { FiFileText, FiDownload, FiAlertCircle, FiCheckCircle, FiLoader, FiXCircle } from 'react-icons/fi';

interface Props {
  siparisId: string;
  invoiceId?: string | null;
  invoiceNo?: string | null;
  pdfUrl?: string | null;
  stornoId?: string | null;
  stornoNo?: string | null;
  stornoPdfUrl?: string | null;
  faturaDurumu?: string | null;
  siparisDurumu?: string | null;
}

export default function LexwareFaturaPaneli({
  siparisId,
  invoiceId,
  invoiceNo,
  pdfUrl,
  stornoId,
  stornoNo,
  stornoPdfUrl,
  faturaDurumu,
  siparisDurumu,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [localInvoiceNo, setLocalInvoiceNo] = useState(invoiceNo);
  const [localPdfUrl, setLocalPdfUrl] = useState(pdfUrl);
  const [localStornoNo, setLocalStornoNo] = useState(stornoNo);
  const [localStornoPdfUrl, setLocalStornoPdfUrl] = useState(stornoPdfUrl);

  const hasInvoice = Boolean(localInvoiceNo || invoiceId);
  const hasStorno = Boolean(localStornoNo || stornoId);

  const handleFaturaOlustur = () => {
    if (!window.confirm('Bu sipariş için Lexware Office üzerinde resmi fatura oluşturulacak ve onaylanacaktır. Devam etmek istiyor musunuz?')) {
      return;
    }

    startTransition(async () => {
      const res = await faturaOlusturAction(siparisId);
      if (res.success) {
        setLocalInvoiceNo(res.invoiceNo || 'Kesildi');
        setLocalPdfUrl(res.pdfUrl || `/api/invoices/${siparisId}/pdf`);
        toast.success(`Lexware faturası başarıyla oluşturuldu (${res.invoiceNo})!`);
      } else {
        toast.error(res.error || 'Fatura oluşturulamadı.');
      }
    });
  };

  const handleFaturaIptal = () => {
    const reason = window.prompt('Fatura iptal (Storno) gerekçesini giriniz:', 'Müşteri talebi / Sipariş iptali');
    if (reason === null) return;

    if (!window.confirm('DİKKAT: Lexware üzerinde bu faturaya bağlı resmi bir "Rechnungskorrektur" (Storno / Ters Kayıt) oluşturulacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
      return;
    }

    startTransition(async () => {
      const res = await faturaIptalEtAction(siparisId, reason);
      if (res.success) {
        setLocalStornoNo(res.creditNoteNo || 'İptal Edildi');
        setLocalStornoPdfUrl(res.stornoPdfUrl || `/api/invoices/${siparisId}/storno-pdf`);
        toast.success(`Fatura resmi olarak iptal edildi ve Storno belgesi düzenlendi (${res.creditNoteNo})!`);
      } else {
        toast.error(res.error || 'İptal işlemi başarısız.');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
            <FiFileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Lexware Office E-Fatura</h3>
            <p className="text-[11px] text-gray-400">Resmi Mali Muhasebe & PDF Arşivi</p>
          </div>
        </div>

        {hasStorno ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <FiXCircle size={12} /> Storno Edildi
          </span>
        ) : hasInvoice ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FiCheckCircle size={12} /> Fatura Kesildi
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FiAlertCircle size={12} /> Fatura Bekliyor
          </span>
        )}
      </div>

      {/* Durum Bilgileri ve Aksiyonlar */}
      {hasInvoice ? (
        <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Fatura Numarası:</span>
            <span className="font-mono font-bold text-gray-800">{localInvoiceNo}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={localPdfUrl || `/api/invoices/${siparisId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FiDownload size={14} /> Fatura PDF Görüntüle / İndir
            </a>

            {!hasStorno && (
              <button
                type="button"
                onClick={handleFaturaIptal}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? <FiLoader className="animate-spin" size={13} /> : <FiXCircle size={13} />}
                Faturayı İptal Et (Storno Kes)
              </button>
            )}
          </div>

          {hasStorno && (
            <div className="mt-3 pt-3 border-t border-rose-100 bg-rose-50/50 p-3 rounded-lg text-xs space-y-2">
              <div className="flex justify-between text-rose-800">
                <span className="font-medium">İptal Belgesi (Storno No):</span>
                <span className="font-mono font-bold">{localStornoNo}</span>
              </div>
              <a
                href={localStornoPdfUrl || `/api/invoices/${siparisId}/storno-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-rose-700 hover:underline font-semibold"
              >
                <FiDownload size={13} /> İptal Belgesi PDF İndir (Rechnungskorrektur)
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Bu sipariş için henüz resmi bir Lexware faturası oluşturulmamıştır. Siparişi hazırlarken veya teslimata verirken resmi faturasını oluşturabilirsiniz.
          </p>
          <button
            type="button"
            onClick={handleFaturaOlustur}
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <FiLoader className="animate-spin" size={14} /> Fatura Oluşturuluyor...
              </>
            ) : (
              <>
                <FiFileText size={14} /> Lexware Faturası Oluştur & Kes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
