// src/app/admin/operasyon/siparisler/[siparisId]/DurumGuncellePaneli.tsx
'use client';

import { useTransition } from 'react';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions'; // Merkezi action'ı kullanıyoruz
import { toast } from 'sonner';
import { FiLoader } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';

type SiparisDurumu = Enums<'siparis_durumu'>;

interface Props {
    siparisId: string;
    mevcutDurum: SiparisDurumu;
}

export default function DurumGuncellePaneli({ siparisId, mevcutDurum }: Props) {
    const [isPending, startTransition] = useTransition();
    
    // Değiştirilebilecek durum seçenekleri
    const durumSecenekleri: SiparisDurumu[] = ['Hazırlanıyor', 'Yola Çıktı', 'Teslim Edildi', 'İptal Edildi'];

    const handleDurumDegistir = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const yeniDurum = e.target.value as SiparisDurumu;
        if (yeniDurum === mevcutDurum) return;

        startTransition(async () => {
            const result = await siparisDurumGuncelleAction(siparisId, yeniDurum);
            if (result.success) {
                toast.success(result.success);
            } else if (result.error) {
                toast.error(result.error);
            }
        });
    };

    // 'Teslim Edildi' veya 'İptal Edildi' durumlarında dropdown'ı devre dışı bırak
    const isDisabled = mevcutDurum === 'Teslim Edildi' || mevcutDurum === 'İptal Edildi';

    return (
        <div className="flex items-center gap-2">
            <select
                value={mevcutDurum}
                onChange={handleDurumDegistir}
                disabled={isPending || isDisabled}
                className="font-bold text-primary bg-secondary border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent disabled:opacity-70"
            >
                {durumSecenekleri.map(durum => (
                    <option key={durum} value={durum}>{durum}</option>
                ))}
            </select>
            {isPending && <FiLoader className="animate-spin text-accent" />}
        </div>
    );
}