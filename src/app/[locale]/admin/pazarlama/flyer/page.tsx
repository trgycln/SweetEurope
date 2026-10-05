import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import FlyerClient from './components/FlyerClient';
import { redirect } from 'next/navigation';

export default async function FlyerPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const locale = params.locale;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Get categories to identify syrups (şuruplar)
    const { data: kategoriler } = await supabase.from('kategoriler').select('id, ad');
    
    // Find category ID for syrups (matching "şurup" or "syrup" or "sirup")
    let surupKategoriIds: string[] = [];
    if (kategoriler) {
        surupKategoriIds = kategoriler
            .filter(k => {
                const adTr = (k.ad as any)?.tr?.toLowerCase() || '';
                const adEn = (k.ad as any)?.en?.toLowerCase() || '';
                const adDe = (k.ad as any)?.de?.toLowerCase() || '';
                return adTr.includes('şurup') || adEn.includes('syrup') || adDe.includes('sirup');
            })
            .map(k => k.id);
    }

    // Fetch products
    let query = supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('aktif', true);

    const { data: urunler, error } = await query;

    if (error) {
        console.error("Error fetching products:", error);
    }

    // Filter products:
    // 1. Prioritize Syrups (if any exist) that are recommended/featured
    // 2. Then other recommended/featured syrups
    // 3. Then other recommended products
    
    let allProducts = urunler || [];
    
    // Convert to a more usable format
    let formattedProducts = allProducts.map(u => ({
        id: u.id,
        ad: u.ad,
        aciklamalar: u.aciklamalar,
        ana_resim_url: u.ana_resim_url,
        is_surup: surupKategoriIds.includes(u.kategori_id),
        is_recommended: u.onerilen === true || u.is_featured === true || u.is_bestseller === true
    }));

    // Sort: Recommended Syrups > Other Syrups > Recommended Others > Others
    formattedProducts.sort((a, b) => {
        const scoreA = (a.is_surup ? 10 : 0) + (a.is_recommended ? 5 : 0);
        const scoreB = (b.is_surup ? 10 : 0) + (b.is_recommended ? 5 : 0);
        return scoreB - scoreA;
    });

    // Take top 4 for the flyer
    const selectedProducts = formattedProducts.slice(0, 4);

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">B2B Tanıtım Broşürü (Flyer)</h1>
                    <p className="text-gray-600">Kafeler için A4 kırılımlı (4 sayfa A5) baskıya hazır broşür</p>
                </div>
            </div>
            
            {/* We will pass the selected products to the client component for rendering and interaction */}
            <FlyerClient initialProducts={selectedProducts} locale={locale} />
        </div>
    );
}
