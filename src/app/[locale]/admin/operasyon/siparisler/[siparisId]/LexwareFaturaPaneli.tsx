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

import { useState, useTransition, useEffect } from 'react';
import { faturaOlusturAction } from '@/app/actions/lexware-actions';
import {
  processOrderPaymentAction,
  cancelOrderAndStornoAction,
  createAndSendInvoiceAction,
  getInvoicePreviewAction,
  type InvoicePreview,
} from '@/app/actions/siparis-muhasebe-actions';
import { toast } from 'sonner';
import {
  FiFileText, FiDownload, FiAlertCircle, FiCheckCircle,
  FiLoader, FiXCircle, FiCreditCard, FiAlertTriangle,
} from 'react-icons/fi';

interface Props {
  siparisId: string;
  proformaId?: string | null;
  proformaNo?: string | null;
  pdfUrl?: string | null;
  stornoId?: string | null;
  stornoNo?: string | null;
  stornoPdfUrl?: string | null;
  proformaDurumu?: string | null;
  siparisDurumu?: string | null;
  odemeDurumu?: string | null;
}

export default function LexwareFaturaPaneli({
  siparisId,
  proformaId,
  proformaNo,
  pdfUrl,
  stornoId,
  stornoNo,
  stornoPdfUrl,
  proformaDurumu,
  siparisDurumu,
  odemeDurumu,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [localProformaNo, setLocalProformaNo] = useState(proformaNo);
  const [localPdfUrl, setLocalPdfUrl] = useState(pdfUrl);
  const [localStornoNo, setLocalStornoNo] = useState(stornoNo);
  const [localStornoPdfUrl, setLocalStornoPdfUrl] = useState(stornoPdfUrl);
  const [localOdemeDurumu, setLocalOdemeDurumu] = useState(odemeDurumu);

  const hasInvoice = Boolean(localProformaNo || proformaId);
  const hasStorno = Boolean(localStornoNo || stornoId);
  const isPaid = localOdemeDurumu === 'paid';

  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fatura henüz kesilmediyse kalemleri önizle (Lexware'e dokunmaz)
  useEffect(() => {
    if (hasInvoice || hasStorno) return;
    let cancelled = false;
    getInvoicePreviewAction(siparisId).then((r) => {
      if (cancelled) return;
      if (r.success && r.preview) setPreview(r.preview);
      else setPreviewError(r.error || 'Önizleme yüklenemedi.');
    });
    return () => { cancelled = true; };
  }, [siparisId, hasInvoice, hasStorno]);

  const eur = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  // -------------------------------------------------------------------
  // "Ödeme Alındı Olarak İşaretle" — Havale müşterileri için (fatura KESMEZ)
  // -------------------------------------------------------------------
  const handleOdemeAlindi = () => {
    if (!window.confirm(
      'Sipariş "Ödendi" olarak işaretlenecektir. Fatura kesilmeyecektir.\n\nDevam etmek istiyor musunuz?'
    )) return;

    startTransition(async () => {
      const res = await processOrderPaymentAction(siparisId);
      if (res.success) {
        setLocalOdemeDurumu('paid');
        toast.success('Sipariş "Ödendi" olarak işaretlendi.');
      } else {
        toast.error(res.error || 'Ödeme işlenirken bir hata oluştu.');
      }
    });
  };

  // -------------------------------------------------------------------
  // "Faturayı Kes & Müşteriye Gönder" — kontrol sonrası manuel tetik
  // -------------------------------------------------------------------
  const handleFaturaGonder = () => {
    if (!window.confirm(
      'Lexware\'de PROFORMA fatura (Auftragsbestätigung) kesilecek ' +
      've PDF müşteriye e-posta ile gönderilecektir.\n\n' +
      'Önizlemedeki kalemleri kontrol ettiniz mi?'
    )) return;

    startTransition(async () => {
      const res = await createAndSendInvoiceAction(siparisId);
      if (res.success) {
        if (res.invoiceNo) {
          setLocalProformaNo(res.invoiceNo);
          setLocalPdfUrl(res.pdfUrl || `/api/invoices/${siparisId}/proforma-pdf`);
        }
        if (res.warning) {
          toast.warning(res.warning, { duration: 8000 });
        } else {
          toast.success(`Proforma fatura kesildi (${res.invoiceNo}) ve müşteriye e-posta gönderildi!`);
        }
      } else {
        toast.error(res.error || 'Proforma oluşturulamadı.');
      }
    });
  };

  // -------------------------------------------------------------------
  // "Lexware Faturası Oluştur & Kes" — Sadece fatura (ödeme durumunu değiştirmez)
  // -------------------------------------------------------------------
  const handleFaturaOlustur = () => {
    if (!window.confirm(
      'Bu sipariş için Lexware Office üzerinde Proforma Fatura (Auftragsbestätigung) oluşturulacaktır.\n' +
      'Devam etmek istiyor musunuz?'
    )) return;

    startTransition(async () => {
      const res = await faturaOlusturAction(siparisId);
      if (res.success) {
        setLocalProformaNo(res.invoiceNo || 'Kesildi');
        setLocalPdfUrl(res.pdfUrl || `/api/invoices/${siparisId}/proforma-pdf`);
        toast.success(`Lexware proforma faturası başarıyla oluşturuldu (${res.invoiceNo})!`);
      } else {
        toast.error(res.error || 'Proforma oluşturulamadı.');
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
            <h3 className="text-sm font-bold text-gray-800">Lexware Proforma Fatura</h3>
            <p className="text-[11px] text-gray-400">Ön Bilgilendirme Belgesi (Sipariş Onayı)</p>
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
            <span className="text-gray-500 font-medium">Proforma Numarası:</span>
            <span className="font-mono font-bold text-gray-800">{localProformaNo}</span>
          </div>

          {isPaid && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
              <FiCheckCircle size={12} />
              <span>Ödeme alındı</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {/* Fatura PDF İndir */}
            <a
              href={localPdfUrl || `/api/invoices/${siparisId}/proforma-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FiDownload size={14} /> Proforma PDF İndir
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
            Bu sipariş için henüz bir Proforma Fatura (Lexware Sipariş Onayı) oluşturulmamıştır.
          </p>

          {/* Havale / Vorkasse için: Ödeme Alındı butonu */}
          {!isPaid && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-2">
              <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <FiCreditCard size={13} />
                Havale (Vorkasse) ile Ödeme Yapıldı mı?
              </p>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                Havale ile gelen ödemeyi onaylamak için bu butona basın. Yalnızca ödeme durumu "Ödendi" olur; fatura aşağıdan, kontrolünüzden sonra kesilir.
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
                    <FiCreditCard size={14} /> Ödeme Alındı Olarak İşaretle
                  </>
                )}
              </button>
            </div>
          )}

          {/* Fatura önizleme kartı */}
          {previewError && (
            <p className="text-xs text-rose-600">{previewError}</p>
          )}
          {preview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-gray-50 px-3.5 py-2 font-bold text-gray-700 border-b border-gray-200">
                Proforma Önizleme (henüz oluşturulmadı)
              </div>
              <div className="px-3.5 py-2.5 text-gray-600 border-b border-gray-100 leading-relaxed">
                <div className="font-semibold text-gray-800">{preview.firma.unvan}</div>
                <div>{preview.firma.adres}</div>
                <div>{preview.firma.plz} {preview.firma.sehir}</div>
                <div className="text-gray-400">{preview.firma.email || 'E-posta yok — mail gönderilemez!'}</div>
              </div>
              <table className="w-full">
                <thead className="text-gray-400 text-[10px] uppercase">
                  <tr>
                    <th className="text-left px-3.5 py-1.5">Ürün</th>
                    <th className="text-right px-2">Adet</th>
                    <th className="text-right px-2">Birim (Net)</th>
                    <th className="text-right px-3.5">Toplam (Net)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3.5 py-1.5 text-gray-800">
                        {it.name}
                        {it.artNo && <span className="block text-[10px] text-gray-400">Art.-Nr.: {it.artNo}</span>}
                      </td>
                      <td className="text-right px-2">{it.qty}</td>
                      <td className="text-right px-2">{eur(it.unitNet)}</td>
                      <td className="text-right px-3.5 font-medium">{eur(it.totalNet)}</td>
                    </tr>
                  ))}
                  {preview.kargo && (
                    <tr className="border-t border-gray-100">
                      <td className="px-3.5 py-1.5 text-gray-800">{preview.kargo.name}</td>
                      <td className="text-right px-2">1</td>
                      <td className="text-right px-2">{eur(preview.kargo.net)}</td>
                      <td className="text-right px-3.5 font-medium">{eur(preview.kargo.net)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="bg-gray-50 px-3.5 py-2.5 space-y-0.5 border-t border-gray-200">
                <div className="flex justify-between"><span>Netto</span><span>{eur(preview.net)}</span></div>
                <div className="flex justify-between"><span>MwSt. {preview.vatRate}%</span><span>{eur(preview.vat)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-sm"><span>Brutto</span><span>{eur(preview.gross)}</span></div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleFaturaGonder}
            disabled={isPending || !preview}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <FiLoader className="animate-spin" size={14} /> Proforma Oluşturuluyor...
              </>
            ) : (
              <>
                <FiFileText size={14} /> Proforma Faturayı Kes &amp; Müşteriye Gönder
              </>
            )}
          </button>

          {/* Sadece Lexware'de oluştur (e-posta göndermez) */}
          <button
            type="button"
            onClick={handleFaturaOlustur}
            disabled={isPending}
            className="block text-[11px] text-gray-400 hover:text-gray-600 underline disabled:opacity-50"
          >
            Sadece Lexware'de oluştur (müşteriye e-posta gönderme)
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
