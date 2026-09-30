'use client';

/**
 * KargoPaneli
 * ===========
 * Admin sipariş detay sayfasında "Kargo & Teslimat" yönetimi kartı.
 *
 * - Kargo Firması seçimi (DHL, UPS, DPD, Spedition, Eigenversand)
 * - Takip Numarası ve Takip Linki girişi
 * - "Kargoya Verildi (Yola Çıktı) Olarak İşaretle" butonu
 * - Sipariş zaten "Yola Çıktı" ise mevcut kargo bilgileri gösterilir
 *
 * KURAL: Eigenversand seçildiğinde takip alanları zorunlu değildir.
 * KURAL: E-posta hatası toast.warning olarak gösterilir, sayfayı çökertmez.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { markOrderAsShippedAction } from '@/app/actions/siparis-kargo-actions';
import {
  FiTruck, FiCheckCircle, FiLoader, FiExternalLink, FiAlertTriangle,
} from 'react-icons/fi';

const KARGO_FIRMASI_OPTIONS = [
  { value: '', label: 'Firma seçin...' },
  { value: 'DHL', label: 'DHL' },
  { value: 'UPS', label: 'UPS' },
  { value: 'DPD', label: 'DPD' },
  { value: 'Hermes', label: 'Hermes' },
  { value: 'GLS', label: 'GLS' },
  { value: 'Spedition', label: 'Spedition (Schwergut)' },
  { value: 'Eigenversand', label: 'Eigenversand (Kendi aracımızla)' },
];

interface Props {
  siparisId: string;
  siparisDurumu: string;
  mevcutKargoFirmasi?: string | null;
  mevcutTakipNo?: string | null;
  mevcutTakipUrl?: string | null;
}

export default function KargoPaneli({
  siparisId,
  siparisDurumu,
  mevcutKargoFirmasi,
  mevcutTakipNo,
  mevcutTakipUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [kargoFirmasi, setKargoFirmasi] = useState(mevcutKargoFirmasi || '');
  const [kargoTakipNo, setKargoTakipNo] = useState(mevcutTakipNo || '');
  const [kargoTakipUrl, setKargoTakipUrl] = useState(mevcutTakipUrl || '');

  const isShipped = siparisDurumu === 'Yola Çıktı' || siparisDurumu === 'Teslim Edildi';
  const isEigenversand = kargoFirmasi === 'Eigenversand';
  const requiresTracking = kargoFirmasi && !isEigenversand;

  const handleKargola = () => {
    if (!kargoFirmasi) {
      toast.error('Lütfen kargo firmasını seçin.');
      return;
    }
    if (requiresTracking && !kargoTakipNo) {
      toast.warning(`${kargoFirmasi} için takip numarası girilmesi önerilir. Yine de devam etmek için tekrar tıklayın.`);
    }

    startTransition(async () => {
      const res = await markOrderAsShippedAction(
        siparisId,
        kargoFirmasi,
        kargoTakipNo,
        kargoTakipUrl
      );

      if (res.success) {
        if (res.warning) {
          toast.warning(res.warning, { duration: 8000 });
        } else {
          toast.success(
            kargoTakipNo
              ? `Sipariş "Yola Çıktı" olarak işaretlendi. Kargo: ${kargoFirmasi} — ${kargoTakipNo}. Müşteriye e-posta gönderildi.`
              : `Sipariş "Yola Çıktı" olarak işaretlendi. Müşteriye bildirim gönderildi.`
          );
        }
        router.refresh();
      } else {
        toast.error(res.error || 'Kargo işlemi başarısız oldu.');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <FiTruck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Kargo & Teslimat</h3>
            <p className="text-[11px] text-gray-400">Sevkiyat Yönetimi</p>
          </div>
        </div>

        {isShipped && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <FiCheckCircle size={12} /> Yola Çıktı
          </span>
        )}
      </div>

      {/* Mevcut Kargo Bilgileri (sipariş kargoya verilmişse) */}
      {isShipped && mevcutKargoFirmasi && (
        <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Kargo Firması:</span>
            <span className="font-bold text-gray-800">{mevcutKargoFirmasi}</span>
          </div>
          {mevcutTakipNo && (
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Takip No:</span>
              <span className="font-mono font-bold text-gray-800">{mevcutTakipNo}</span>
            </div>
          )}
          {mevcutTakipUrl && (
            <a
              href={mevcutTakipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline mt-1"
            >
              <FiExternalLink size={12} /> Sendung verfolgen (Kargoyu Takip Et)
            </a>
          )}
        </div>
      )}

      {/* Form — Her zaman düzenlenebilir (güncellemek için) */}
      <div className="space-y-3">
        {/* Kargo Firması */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5">
            Kargo Firması <span className="text-red-500">*</span>
          </label>
          <select
            id="kargo-firmasi-select"
            value={kargoFirmasi}
            onChange={(e) => setKargoFirmasi(e.target.value)}
            disabled={isPending}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-colors disabled:opacity-50"
          >
            {KARGO_FIRMASI_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Takip Numarası */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5">
            Takip Numarası
            {requiresTracking && (
              <span className="ml-1 text-amber-600 font-normal">(önerilir)</span>
            )}
            {isEigenversand && (
              <span className="ml-1 text-gray-400 font-normal">(zorunlu değil)</span>
            )}
          </label>
          <input
            id="kargo-takip-no-input"
            type="text"
            value={kargoTakipNo}
            onChange={(e) => setKargoTakipNo(e.target.value)}
            disabled={isPending}
            placeholder={isEigenversand ? 'Eigenversand — takip numarası gerekmez' : 'Örn: 1Z999AA10123456784'}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-colors disabled:opacity-50 placeholder:font-sans placeholder:text-gray-400"
          />
        </div>

        {/* Takip Linki */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5">
            Takip Linki (URL)
            {isEigenversand && (
              <span className="ml-1 text-gray-400 font-normal">(zorunlu değil)</span>
            )}
          </label>
          <input
            id="kargo-takip-url-input"
            type="url"
            value={kargoTakipUrl}
            onChange={(e) => setKargoTakipUrl(e.target.value)}
            disabled={isPending}
            placeholder="https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-colors disabled:opacity-50 placeholder:text-gray-400"
          />
        </div>

        {/* Eigenversand uyarısı */}
        {isEigenversand && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-xs text-amber-800">
            <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>Eigenversand seçildi. Takip numarası ve linki zorunlu değildir. Müşteriye bildirim yine de gönderilecektir.</span>
          </div>
        )}

        {/* Kargola Butonu */}
        <button
          type="button"
          id="kargola-btn"
          onClick={handleKargola}
          disabled={isPending || !kargoFirmasi}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <FiLoader className="animate-spin" size={14} /> İşleniyor...
            </>
          ) : (
            <>
              <FiTruck size={14} />
              {isShipped ? 'Kargo Bilgilerini Güncelle' : 'Kargoya Verildi (Yola Çıktı) Olarak İşaretle'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
