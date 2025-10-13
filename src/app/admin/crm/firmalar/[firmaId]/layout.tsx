// src/app/admin/crm/firmalar/[firmaId]/layout.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import React from 'react';
import FirmaTabs from './FirmaTabs'; // Sekme navigasyonunu import ediyoruz

export default async function FirmaDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { firmaId: string };
}) {
    const supabase = createSupabaseServerClient();

    // Firma adını başlıkta göstermek için temel bilgiyi çekelim
    const { data: firma } = await supabase
        .from('firmalar')
        .select('unvan')
        .eq('id', params.firmaId)
        .single();

    if (!firma) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{firma.unvan}</h1>
                <p className="text-text-main/80 mt-1">Firma Detay Yönetim Paneli</p>
            </header>

            <main>
                {/* Sekme Linkleri */}
                <FirmaTabs firmaId={params.firmaId} />
                
                {/* Aktif Sekmenin İçeriği (`page.tsx` dosyaları) */}
                <div className="mt-6 bg-white p-6 sm:p-8 rounded-b-2xl shadow-lg">
                    {children}
                </div>
            </main>
        </div>
    );
}