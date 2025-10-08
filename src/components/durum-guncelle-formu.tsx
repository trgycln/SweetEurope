// src/components/durum-guncelle-formu.tsx
'use client';

import { useState, useTransition } from "react";
import { Enums, Tables } from "@/lib/supabase/database.types";
import { siparisDurumGuncelleAction } from "@/app/actions/siparis-actions";

type SiparisStatus = Enums<'siparis_durumu'>;

export function DurumGuncelleFormu({ siparis }: { siparis: Tables<'siparisler'> }) {
    const [status, setStatus] = useState<SiparisStatus>(siparis.siparis_statusu);
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success?: string, error?: string } | null>(null);

    const statusOptions: SiparisStatus[] = ["Beklemede", "Hazırlanıyor", "Yola Çıktı", "Teslim Edildi", "İptal Edildi"];
    
    const handleSubmit = () => {
        setResult(null);
        startTransition(async () => {
            const res = await siparisDurumGuncelleAction(siparis.id, status);
            setResult(res);
        });
    };

    return (
        <div className="bg-bg-subtle p-4 rounded-lg space-y-3">
            <label htmlFor="status-select" className="text-sm font-bold text-text-main/80">Sipariş Durumunu Güncelle:</label>
            <div className="flex gap-2">
                <select 
                    id="status-select"
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as SiparisStatus)}
                    className="flex-grow bg-white border border-gray-300 rounded-md p-2 text-sm"
                >
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <button onClick={handleSubmit} disabled={isPending || status === siparis.siparis_statusu} className="px-4 py-2 bg-accent text-white font-bold rounded-md disabled:bg-gray-400">
                    {isPending ? "..." : "Kaydet"}
                </button>
            </div>
            {result?.success && <p className="text-sm text-green-600">{result.success}</p>}
            {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
        </div>
    );
}