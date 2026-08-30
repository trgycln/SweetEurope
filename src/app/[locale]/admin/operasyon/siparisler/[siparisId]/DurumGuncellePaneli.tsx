'use client';

import { useState, useTransition } from 'react';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
import { toast } from 'sonner';
import { FiLoader, FiCheck, FiTruck, FiPackage, FiX } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

type SiparisDurumu = Enums<'siparis_durumu'>;

interface Props {
    siparisId: string;
    mevcutDurum: SiparisDurumu | string;
    locale?: string;
}

const DURUM_BUTONLARI: {
    durum: SiparisDurumu;
    label: string;
    icon: React.ReactNode;
    color: string;
}[] = [
    { durum: 'Hazırlanıyor', label: 'Hazırlanıyor', icon: <FiPackage size={14} />, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { durum: 'Yola Çıktı',   label: 'Yola Çıktı',  icon: <FiTruck size={14} />,   color: 'bg-violet-600 hover:bg-violet-700 text-white' },
    { durum: 'Teslim Edildi',label: 'Teslim Edildi',icon: <FiCheck size={14} />,   color: 'bg-green-600 hover:bg-green-700 text-white' },
    { durum: 'İptal Edildi', label: 'İptal Edildi', icon: <FiX size={14} />,       color: 'bg-red-600 hover:bg-red-700 text-white' },
];

export default function DurumGuncellePaneli({ siparisId, mevcutDurum }: Props) {
    const [isPending, startTransition] = useTransition();
    const [aktifDurum, setAktifDurum] = useState<string>(mevcutDurum);

    const isFinished = aktifDurum === 'Teslim Edildi' || aktifDurum === 'İptal Edildi' || aktifDurum === 'cancelled';
    const isPreOrder = aktifDurum === 'Ön Sipariş';

    const handleDurumDegistir = (yeniDurum: SiparisDurumu) => {
        if (yeniDurum === aktifDurum) return;

        startTransition(async () => {
            const res = await siparisDurumGuncelleAction(siparisId, yeniDurum);
            if (res.success) {
                setAktifDurum(yeniDurum);
                toast.success(`Sipariş durumu "${yeniDurum}" olarak güncellendi.`);
            } else {
                toast.error(res.error || 'Durum güncellenirken hata oluştu.');
            }
        });
    };

    const handlePreOrderConvert = () => {
        startTransition(async () => {
            const { onSiparisiNormalSipariseDonusturAction } = await import('@/app/actions/siparis-actions');
            const result = await onSiparisiNormalSipariseDonusturAction(siparisId);
            if (result.success) {
                setAktifDurum('Hazırlanıyor');
                toast.success('Ön sipariş başarıyla normal siparişe dönüştürüldü ve stoklar düşüldü!');
            } else {
                toast.error(result.error || 'Dönüştürme başarısız');
            }
        });
    };

    const handlePreOrderCancel = () => {
        const reason = window.prompt('İptal nedeni / Müşteri bilgilendirme notu (Opsiyonel):', 'Ürün tedarik edilemedi');
        if (reason === null) return; // user cancelled prompt

        startTransition(async () => {
            const { onSiparisiIptalEtAction } = await import('@/app/actions/siparis-actions');
            const result = await onSiparisiIptalEtAction(siparisId, reason);
            if (result.success) {
                setAktifDurum('İptal Edildi');
                toast.success('Ön sipariş iptal edildi ve müşteriye bildirim gönderildi.');
            } else {
                toast.error(result.error || 'İptal başarısız');
            }
        });
    };

    if (isPreOrder) {
        return (
            <div className="space-y-3 bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                    <span className="text-lg">⏳</span>
                    <span>Bu sipariş bir <strong>Ön Sipariş / Talep</strong> kaydıdır. Henüz stok düşülmemiştir.</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                    <button
                        onClick={handlePreOrderConvert}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={15} /> : <FiCheck size={15} />}
                        ✅ Stok Geldi → Sevkiyata Al (Hazırlanıyor)
                    </button>
                    <button
                        onClick={handlePreOrderCancel}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={15} /> : <FiX size={15} />}
                        ❌ Tedarik Edilemedi / İptal Et
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {DURUM_BUTONLARI.map(btn => (
                <button
                    key={btn.durum}
                    onClick={() => handleDurumDegistir(btn.durum)}
                    disabled={isPending || btn.durum === aktifDurum}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border disabled:cursor-not-allowed ${
                        btn.durum === aktifDurum
                            ? `${btn.color} opacity-100 ring-2 ring-offset-1 ring-current`
                            : `${btn.color} opacity-70 hover:opacity-100 border-transparent`
                    }`}
                >
                    {isPending ? <FiLoader className="animate-spin" size={14} /> : btn.icon}
                    {btn.label}
                    {btn.durum === aktifDurum && <FiCheck size={11} className="ml-1" />}
                </button>
            ))}
        </div>
    );
}
