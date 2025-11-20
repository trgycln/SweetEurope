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
type Sablon = Pick<Tables<'kategori_ozellik_sablonlari'>, 'alan_adi' | 'gosterim_adi'>;
// Typ für Urun mit Kategorie
type UrunWithKategorie = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'ust_kategori_id'> | null;
    ortalama_puan?: number | null;
    degerlendirme_sayisi?: number | null;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { locale, slug } = await params;
    const dictionary = await getDictionary(locale as any);

    const { data: urun } = await supabase
        .from('urunler')
        .select('ad, aciklama, resim_url')
        .eq('slug', slug)
        .eq('aktif', true)
        .single();

    if (!urun) {
        return {
            title: 'Product Not Found | Elysion Sweets',
        };
    }

    const title = dictionary.seo?.productDetail?.titleTemplate?.replace('%{product}', urun.ad) || `${urun.ad} | Elysion Sweets`;
    const description = dictionary.seo?.productDetail?.descriptionTemplate
        ?.replace('%{product}', urun.ad)
        ?.replace('%{description}', urun.aciklama || '') || urun.aciklama || '';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: urun.resim_url ? [urun.resim_url] : [],
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
            // Kategorie-Daten (ust_kategori_id dahil) + Review alanları
            .select(`*, kategoriler (id, ad, ust_kategori_id)`) 
            .eq('slug', slug)
            .eq('aktif', true) // Only show active products
            .single()
    ]);
    
    const urun = urunData as (UrunWithKategorie & { ortalama_puan?: number; degerlendirme_sayisi?: number }) | null;

    if (!urun) {
        return notFound();
    }

    const kategoriId = urun.kategoriler?.id;
    const parentId = (urun.kategoriler as any)?.ust_kategori_id as string | undefined;
    let ozellikSablonu: Sablon[] = [];

    if (kategoriId) {
        // 1) Önce alt kategorinin şablonunu dene
        const { data: directTemplate } = await supabase
            .from('kategori_ozellik_sablonlari')
            .select('alan_adi, gosterim_adi, sira')
            .eq('kategori_id', kategoriId)
            .order('sira');

        if (directTemplate && directTemplate.length > 0) {
            ozellikSablonu = directTemplate as any;
        } else if (parentId) {
            // 2) Alt kategoride yoksa ebeveyn şablonuna düş
            const { data: parentTemplate } = await supabase
                .from('kategori_ozellik_sablonlari')
                .select('alan_adi, gosterim_adi, sira')
                .eq('kategori_id', parentId)
                .order('sira');
            ozellikSablonu = (parentTemplate || []) as any;
        }
    }

    // Review alanlarını güvenli tipe indir
    const ortalamaPuan: number | null = typeof urun.ortalama_puan === 'number' ? urun.ortalama_puan : null;
    const degerlendirmeSayisi: number | null = typeof urun.degerlendirme_sayisi === 'number' ? urun.degerlendirme_sayisi : null;

    // KORREKTUR: 'price'-Prop wird nicht mehr übergeben
    return (
        <>
            <UrunDetayGorunumu
                urun={urun}
                ozellikSablonu={ozellikSablonu}
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