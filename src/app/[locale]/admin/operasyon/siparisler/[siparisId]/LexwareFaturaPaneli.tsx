'use client';

/**
 * LexwareFaturaPaneli
 * ===================
 * Admin sipariş sayfasında fatura yönetimi paneli.
 *
 * Özellikler:
 * - "Ödeme Alındı Olarak İşaretle": Havale ödemeleri için manuel tetikleyici.
 *   processOrderPaymentAction → fatura keser + müşteriye PDF'li e-posta gönderir.
 * - "Lexware Faturası Oluştur & Kes": Sadece fatura kesmek için (ödeme durumunu değiştirmez).
 * - "Faturayı İptal Et (Storno)": cancelOrderAndStornoAction → storno keser + stok geri yükler + e-posta.
 * - Fatura PDF ve Storno PDF indirme butonları.
 *
 * IDEMPOTENCY: Her iki action da mükerrer işlemi engeller.
 * GRACEFUL FAILURE: Lexware/e-posta hatası bilgilendirici uyarı gösterir, çökmez.
 */

import { useState, useTransition } from 'react';
import { faturaOlusturAction } from '@/app/actions/lexware-actions';
import { processOrderPaymentAction, cancelOrderAndStornoAction } from '@/app/actions/siparis-muhasebe-actions';
import { toast } from 'sonner';
import {
  FiFileText, FiDownload, FiAlertCircle, FiCheckCircle,
  FiLoader, FiXCircle, FiCreditCard, FiAlertTriangle,
} from 'react-icons/fi';

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
  odemeDurumu?: string | null;
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
  odemeDurumu,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [localInvoiceNo, setLocalInvoiceNo] = useState(invoiceNo);
  const [localPdfUrl, setLocalPdfUrl] = useState(pdfUrl);
  const [localStornoNo, setLocalStornoNo] = useState(stornoNo);
  const [localStornoPdfUrl, setLocalStornoPdfUrl] = useState(stornoPdfUrl);
  const [localOdemeDurumu, setLocalOdemeDurumu] = useState(odemeDurumu);

  const hasInvoice = Boolean(localInvoiceNo || invoiceId);
  const hasStorno = Boolean(localStornoNo || stornoId);
  const isPaid = localOdemeDurumu === 'paid';

  // -------------------------------------------------------------------
  // "Ödeme Alındı Olarak İşaretle" — Havale müşterileri için manuel akış
  // Fatura keser + müşteriye PDF'li e-posta gönderir
  // -------------------------------------------------------------------
  const handleOdemeAlindi = () => {
    if (!window.confirm(
      'Siparişi "Ödendi" olarak işaretleyecek ve Lexware\'de resmi fatura kesilecektir.\n' +
      'Müşteriye fatura PDF\'i e-posta ile gönderilecektir.\n\n' +
      'Devam etmek istiyor musunuz?'
    )) return;

    startTransition(async () => {
      const res = await processOrderPaymentAction(siparisId);

      if (res.success) {
        setLocalOdemeDurumu('paid');
        if (res.invoiceNo) {
          setLocalInvoiceNo(res.invoiceNo);
          setLocalPdfUrl(res.pdfUrl || `/api/invoices/${siparisId}/pdf`);
        }

        if (res.warning) {
          // Kısmi başarı — işlem tamamlandı ama bir sorun var
          toast.warning(res.warning, { duration: 8000 });
        } else if (res.invoiceNo) {
          toast.success(`Ödeme alındı, fatura kesildi (${res.invoiceNo}) ve müşteriye e-posta gönderildi!`);
        } else {
          toast.success('Sipariş "Ödendi" olarak işaretlendi.');
        }
      } else {
        toast.error(res.error || 'Ödeme işlenirken bir hata oluştu.');
      }
    });
  };

  // -------------------------------------------------------------------
  // "Lexware Faturası Oluştur & Kes" — Sadece fatura (ödeme durumunu değiştirmez)
  // -------------------------------------------------------------------
  const handleFaturaOlustur = () => {
    if (!window.confirm(
      'Bu sipariş için Lexware Office üzerinde resmi fatura oluşturulacak ve onaylanacaktır.\n' +
      'Devam etmek istiyor musunuz?'
    )) return;

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

  // -------------------------------------------------------------------
  // "Siparişi İptal Et (Storno)" — Storno + stok geri yükleme + e-posta
  // -------------------------------------------------------------------
  const handleFaturaIptal = () => {
    const reason = window.prompt(
      'İptal gerekçesini giriniz (Storno belgesine işlenecektir):',
      'Müşteri talebi / Kundenstornierung'
    );
    if (reason === null) return;

    if (!window.confirm(
      'DİKKAT: Bu işlem geri alınamaz!\n\n' +
      '• Lexware\'de resmi Rechnungskorrektur (Storno) kesilecektir.\n' +
      '• Müşteriye iptal faturası e-posta ile gönderilecektir.\n' +
      '• Sipariş stokları geri yüklenecektir.\n\n' +
      'Onaylıyor musunuz?'
    )) return;

    startTransition(async () => {
      const res = await cancelOrderAndStornoAction(siparisId, reason);
      if (res.success) {
        if (res.creditNoteNo) {
          setLocalStornoNo(res.creditNoteNo);
          setLocalStornoPdfUrl(res.stornoPdfUrl || `/api/invoices/${siparisId}/storno-pdf`);
        }

        if (res.warning) {
          toast.warning(res.warning, { duration: 8000 });
        } else {
          toast.success(
            `Sipariş iptal edildi${res.creditNoteNo ? `, Storno kesildi (${res.creditNoteNo})` : ''} ve müşteriye bildirildi!`
          );
        }
      } else {
        toast.error(res.error || 'İptal işlemi başarısız.');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Başlık */}
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

        {/* Durum rozeti */}
        {hasStorno ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <FiXCircle size={12} /> Storno Edildi
          </span>
        ) : hasInvoice ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FiCheckCircle size={12} /> Fatura Kesildi
          </span>
        ) : isPaid ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FiCreditCard size={12} /> Ödendi (Faturasız)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FiAlertCircle size={12} /> Fatura Bekliyor
          </span>
        )}
      </div>

      {/* İçerik */}
      {hasInvoice ? (
        <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Fatura Numarası:</span>
            <span className="font-mono font-bold text-gray-800">{localInvoiceNo}</span>
          </div>

          {isPaid && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
              <FiCheckCircle size={12} />
              <span>Ödeme alındı — müşteriye fatura e-postası gönderildi</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {/* Fatura PDF İndir */}
            <a
              href={localPdfUrl || `/api/invoices/${siparisId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FiDownload size={14} /> Fatura PDF Görüntüle / İndir
            </a>

            {/* Storno butonu — sadece storno kesilmemişse */}
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

          {/* Storno bilgileri */}
          {hasStorno && (
            <div className="mt-3 pt-3 border-t border-rose-100 bg-rose-50/50 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800">
                <FiAlertTriangle size={12} />
                <span className="font-bold">Bu fatura storno edilmiştir</span>
              </div>
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
            Bu sipariş için henüz resmi bir Lexware faturası oluşturulmamıştır.
          </p>

          {/* Havale / Vorkasse için: Ödeme Alındı butonu */}
          {!isPaid && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-2">
              <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <FiCreditCard size={13} />
                Havale (Vorkasse) ile Ödeme Yapıldı mı?
              </p>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                Havale ile gelen ödemeyi onaylamak için bu butona basın. Sistem otomatik olarak faturayı kesecek ve müşteriye PDF'li e-posta gönderecektir.
              </p>
              <button
                type="button"
                onClick={handleOdemeAlindi}
                disabled={isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <FiLoader className="animate-spin" size={14} /> İşleniyor...
                  </>
                ) : (
                  <>
                    <FiCreditCard size={14} /> Ödeme Alındı Olarak İşaretle & Fatura Kes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sadece fatura kesmek isteyenler için ayrı buton */}
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
                <FiFileText size={14} /> Sadece Lexware Faturası Oluştur & Kes
              </>
            )}
          </button>

          {/* İptal Et butonu (fatura olmasa da siparişi iptal etmek mümkün) */}
          {siparisDurumu !== 'İptal Edildi' && (
            <button
              type="button"
              onClick={handleFaturaIptal}
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? <FiLoader className="animate-spin" size={13} /> : <FiXCircle size={13} />}
              Siparişi İptal Et (Stok Geri Yükle)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
