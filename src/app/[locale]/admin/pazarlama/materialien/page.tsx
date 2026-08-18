// src/app/[locale]/admin/pazarlama/materialien/page.tsx
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { MaterialienClient } from './MaterialienClient';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

type MaterialRow = Tables<'pazarlama_materyalleri'>;

interface MaterialienListPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        q?: string;
        kategori?: string;
        hedef?: string;
    }>;
}

export default async function MaterialienListPage({
    params,
    searchParams
}: MaterialienListPageProps) {
    noStore();
    const { locale } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const searchQuery = resolvedSearchParams?.q || '';
    const kategorieFilter = resolvedSearchParams?.kategori || '';
    const hedefFilter = resolvedSearchParams?.hedef || '';

    let query = supabase
        .from('pazarlama_materyalleri')
        .select(`*`);

    if (searchQuery) {
        query = query.ilike('baslik', `%${searchQuery}%`);
    }
    if (kategorieFilter) {
        query = query.eq('kategori', kategorieFilter as Enums<'materyal_kategori'>);
    }
    if (hedefFilter) {
        query = query.eq('hedef_kitle', hedefFilter as Enums<'hedef_rol'>);
    }

    const { data: materialienData, error } = await query.order('created_at', { ascending: false });

    let materialien: MaterialRow[] = [];

    if (error) {
        console.error("Server: Marketingmaterial-Daten konnten nicht abgerufen werden:", JSON.stringify(error, null, 2));
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Marketingmaterialien. Details: {error.message}</div>;
    } else {
        materialien = materialienData as MaterialRow[];
    }

    const kategorieOptions: Enums<'materyal_kategori'>[] = ["Broşürler", "Ürün Fotoğrafları", "Sosyal Medya Kitleri", "Fiyat Listeleri", "Diğer"];
    const hedefKitleOptions: Enums<'hedef_rol'>[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    return (
        <MaterialienClient
            materialListe={materialien}
            kategorieOptions={kategorieOptions}
            hedefKitleOptions={hedefKitleOptions}
        />
    );
}