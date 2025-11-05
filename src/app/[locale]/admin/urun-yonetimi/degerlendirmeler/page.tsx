// src/app/[locale]/admin/urun-yonetimi/degerlendirmeler/page.tsx
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { DegerlendirmelerClient } from './DegerlendirmelerClient';

export const dynamic = 'force-dynamic';

export default async function DegerlendirmelerPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const dictionary = await getDictionary(locale);

  // Fetch pending reviews
  const { data: pendingReviews, error } = await supabase
    .from('urun_degerlendirmeleri')
    .select(`
      id,
      urun_id,
      kullanici_id,
      firma_id,
      puan,
      baslik,
      yorum,
      created_at,
      onay_durumu
    `)
    .eq('onay_durumu', 'beklemede')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reviews:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }

  // Manually fetch related data
  const reviews = await Promise.all((pendingReviews || []).map(async (r: any) => {
    const { data: profil } = await supabase
      .from('profiller')
      .select('tam_ad')
      .eq('id', r.kullanici_id)
      .single();

    const { data: firma } = r.firma_id ? await supabase
      .from('firmalar')
      .select('unvan, email')
      .eq('id', r.firma_id)
      .single() : { data: null };

    const { data: urun } = await supabase
      .from('urunler')
      .select('ad')
      .eq('id', r.urun_id)
      .single();

    return {
      ...r,
      kullanici_adi: profil?.tam_ad || 'Anonim',
      kullanici_email: firma?.email || '',
      firma_adi: firma?.unvan || null,
      urun_adi: urun?.ad?.[locale] || urun?.ad?.de || 'Ürün',
    };
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Ürün Değerlendirmeleri
        </h1>
        <p className="text-gray-600 mt-2">
          Müşteri değerlendirmelerini onaylayın veya reddedin
        </p>
      </div>

      <DegerlendirmelerClient reviews={reviews} locale={locale} />
    </div>
  );
}
