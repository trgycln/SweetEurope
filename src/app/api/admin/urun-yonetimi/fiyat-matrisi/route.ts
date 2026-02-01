import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = await createSupabaseServerClient(cookieStore);

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get all products
        const { data: urunler, error: urunlerError } = await supabase
            .from('urunler')
            .select('id, ad, kategori_id, distributor_alis_fiyati, satis_fiyati_alt_bayi, aktif')
            .eq('aktif', true)
            .order('ad->>tr', { ascending: true })
            .limit(1000);

        if (urunlerError) {
            console.error('Error fetching products:', urunlerError);
            return NextResponse.json(
                { error: 'Failed to fetch products' },
                { status: 500 }
            );
        }

        // Get all categories for category names
        const { data: kategoriler, error: katError } = await supabase
            .from('kategoriler')
            .select('id, ad')
            .limit(500);

        if (katError) {
            console.error('Error fetching categories:', katError);
        }

        // Create category lookup
        const categoryMap: any = {};
        if (kategoriler) {
            kategoriler.forEach((k: any) => {
                categoryMap[k.id] = k.ad;
            });
        }

        // Get all firms (distributors)
        const { data: firmalar, error: firmaError } = await supabase
            .from('firmalar')
            .select('id, unvan')
            .order('unvan', { ascending: true })
            .limit(500);

        if (firmaError) {
            console.error('Error fetching firms:', firmaError);
            return NextResponse.json(
                { error: 'Failed to fetch firms' },
                { status: 500 }
            );
        }

        // Get all sub-dealers (alt bayiler) from profiller
        const { data: altBayiler, error: bayiError } = await (supabase as any)
            .from('profiller')
            .select('id, tam_ad, firma_id')
            .eq('rol', 'Alt Bayi')
            .order('tam_ad', { ascending: true })
            .limit(500);

        if (bayiError) {
            console.error('Error fetching sub-dealers:', bayiError);
        }

        // Get all price exceptions - Fixed table name
        const { data: istisnalar, error: istError } = await (supabase as any)
            .from('fiyat_istisnalari')
            .select('urun_id, firma_id, ozel_fiyat_net, kanal')
            .limit(5000);

        if (istError) {
            console.error('Error fetching exceptions:', istError);
            // Don't fail, just continue without exceptions
            console.warn('Warning: fiyat_istisnalari table not accessible, continuing without exceptions');
        }

        // Build price matrix data structure
        const priceMatrix: any = {};
        
        // Initialize with distributor prices
        if (urunler) {
            urunler.forEach((urun: any) => {
                priceMatrix[urun.id] = {
                    urunId: urun.id,
                    urunAd: urun.ad,
                    kategoriId: urun.kategori_id,
                    kategoriAd: categoryMap[urun.kategori_id] || urun.kategori_id,
                    baseFiyat: urun.distributor_alis_fiyati || 0,
                    altBayiFiyat: urun.satis_fiyati_alt_bayi || 0,
                    firmalar: {},
                    altBayiler: {}
                };
            });
        }

        // Initialize all firma columns (distributors)
        if (firmalar) {
            firmalar.forEach((firma: any) => {
                Object.keys(priceMatrix).forEach((urunId: string) => {
                    priceMatrix[urunId].firmalar[firma.id] = {
                        firmaId: firma.id,
                        firmaUnvan: firma.unvan,
                        fiyat: priceMatrix[urunId].baseFiyat,
                        kanal: 'firma',
                        isFiyatistisna: false
                    };
                });
            });
        }

        // Initialize all alt bayi columns
        if (altBayiler) {
            altBayiler.forEach((bayi: any) => {
                Object.keys(priceMatrix).forEach((urunId: string) => {
                    priceMatrix[urunId].altBayiler[bayi.id] = {
                        bayiId: bayi.id,
                        bayiAd: bayi.tam_ad,
                        fiyat: priceMatrix[urunId].altBayiFiyat,
                        kanal: 'alt_bayi',
                        isFiyatistisna: false
                    };
                });
            });
        }

        // Apply exceptions/custom prices
        if (istisnalar) {
            istisnalar.forEach((ist: any) => {
                if (priceMatrix[ist.urun_id] && priceMatrix[ist.urun_id].firmalar[ist.firma_id]) {
                    priceMatrix[ist.urun_id].firmalar[ist.firma_id] = {
                        firmaId: ist.firma_id,
                        fiyat: ist.ozel_fiyat_net || ist.fiyat,
                        kanal: ist.kanal,
                        isFiyatistisna: true
                    };
                }
            });
        }

        // Convert to array format for easier processing
        const matrixArray = Object.values(priceMatrix).map((p: any) => ({
            ...p,
            firmalaPrices: Object.values(p.firmalar),
            altBayiPrices: Object.values(p.altBayiler)
        }));

        // Combine firms and alt bayiler for display
        const allColumns = [
            ...(firmalar || []).map((f: any) => ({
                id: f.id,
                unvan: f.unvan,
                type: 'firma'
            })),
            ...(altBayiler || []).map((b: any) => ({
                id: b.id,
                unvan: b.tam_ad,
                type: 'alt_bayi'
            }))
        ];

        return NextResponse.json({
            products: matrixArray,
            firms: firmalar || [],
            altBayiler: altBayiler || [],
            allColumns,
            totalProducts: urunler?.length || 0,
            totalFirms: firmalar?.length || 0,
            totalAltBayiler: altBayiler?.length || 0
        });
    } catch (error) {
        console.error('Error in price-matrix API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
