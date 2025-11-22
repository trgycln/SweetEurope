import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
// Korrekte Komponente importieren
import { UrunDetayGorunumu } from '@/components/urun-detay-gorunumu';
import { UrunReviewSection } from '@/components/UrunReviewSection';
import { Locale } from '@/lib/utils'; // Locale aus utils holen
import { Tables } from '@/lib/supabase/database.types';
import type { Metadata } from 'next';

// Typ für die Sablon-Daten
type Sablon = {
    alan_adi: string;
    gosterim_adi: string;
};

// Typ für Urun mit Kategorie
type UrunWithKategorie = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'id' | 'kategori_adi' | 'ust_kategori_id'> | null;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;
    const dictionary = await getDictionary(locale as any);

    const { data: urun } = await supabase
        .from('urunler')
        .select('urun_adi, aciklama, gorsel_url')
        .eq('slug', slug)
        .eq('aktif', true)
        .single();

    if (!urun) {
        return {
            title: 'Product Not Found | Elysion Sweets',
        };
    }

    const title = dictionary.seo?.productDetail?.titleTemplate?.replace('%{product}', urun.urun_adi) || `${urun.urun_adi} | Elysion Sweets`;
    const description = dictionary.seo?.productDetail?.descriptionTemplate
        ?.replace('%{product}', urun.urun_adi)
        ?.replace('%{description}', urun.aciklama || '') || urun.aciklama || '';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: urun.gorsel_url ? [urun.gorsel_url] : [],
            locale: locale,
            type: 'website',
        },
    };
}

export default async function PublicUrunDetayPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;

    // Dictionary und Produkt parallel abrufen
    const [dictionary, { data: urunData }] = await Promise.all([
        getDictionary(locale as any),
        supabase
            .from('urunler')
            // Kategorie-Daten (ust_kategori_id dahil)
            .select(`*, kategoriler (id, ad, ust_kategori_id)`) 
            .eq('slug', slug)
            .eq('aktif', true) // Only show active products
            .single()
    ]);
    
    const urun = urunData as UrunWithKategorie | null;

    if (!urun) {
        return notFound();
    }

    // Calculate actual review statistics from urun_degerlendirmeleri table
    const { data: reviewStats } = await supabase
        .from('urun_degerlendirmeleri')
        .select('puan')
        .eq('urun_id', urun.id)
        .eq('onaylandi', true);

    const degerlendirmeSayisi = reviewStats?.length || 0;
    const ortalamaPuan = degerlendirmeSayisi > 0
        ? reviewStats!.reduce((sum, r) => sum + r.puan, 0) / degerlendirmeSayisi
        : null;

    const kategoriId = urun.kategoriler?.id;
    const parentId = (urun.kategoriler as any)?.ust_kategori_id as string | undefined;
    let ozellikSablonu: Sablon[] = [];

    if (kategoriId) {
        // 1) Önce alt kategorinin şablonunu dene
        const { data: directTemplate } = await supabase
            .from('kategori_ozellik_sablonlari' as any)
            .select('alan_adi, gosterim_adi, sira')
            .eq('kategori_id', kategoriId)
            .order('sira');

        if (directTemplate && directTemplate.length > 0) {
            ozellikSablonu = directTemplate as any;
        } else if (parentId) {
            // 2) Alt kategoride yoksa ebeveyn şablonuna düş
            const { data: parentTemplate } = await supabase
                .from('kategori_ozellik_sablonlari' as any)
                .select('alan_adi, gosterim_adi, sira')
                .eq('kategori_id', parentId)
                .order('sira');
            ozellikSablonu = (parentTemplate || []) as any;
        }
    }

    // KORREKTUR: 'price'-Prop wird nicht mehr übergeben
    return (
        <>
            <UrunDetayGorunumu
                urun={urun as any}
                ozellikSablonu={ozellikSablonu as any}
                locale={locale}
            />
            
            {/* Review Section */}
            <UrunReviewSection
                urunId={urun.id}
                ortalamaPuan={ortalamaPuan}
                degerlendirmeSayisi={degerlendirmeSayisi}
                mode="public"
                dictionary={dictionary}
                locale={locale}
            />
        </>
    );
}