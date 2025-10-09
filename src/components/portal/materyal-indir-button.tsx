// src/components/portal/materyal-indir-button.tsx
'use client';

import { useState, useTransition } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';
// DÜZELTME: Doğru Server Action'ı import ediyoruz.
import { getFileDownloadUrlAction } from '@/app/actions/storage-actions'; 

export function MateryalIndirButton({ dosyaYolu, dosyaAdi }: { dosyaYolu: string, dosyaAdi: string | null }) {
    const [isPending, startTransition] = useTransition();

    const handleDownload = () => {
        startTransition(async () => {
            const result = await getFileDownloadUrlAction(dosyaYolu, 'pazarlama-materyalleri');
            if (result.url) {
                // Güvenli linki yeni bir sekmede açarak indirmeyi başlat
                window.open(result.url, '_blank');
            } else {
                alert(result.error || "Dosya indirilemedi.");
            }
        });
    };

    return (
        <button 
            onClick={handleDownload}
            disabled={isPending}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg text-sm font-bold hover:bg-opacity-90 disabled:bg-gray-400"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiDownload />}
            {isPending ? 'Hazırlanıyor...' : (dosyaAdi || 'İndir')}
        </button>
    );
}