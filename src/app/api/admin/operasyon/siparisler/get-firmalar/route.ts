import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

        const { selectedOrderIds } = await request.json();

        if (!Array.isArray(selectedOrderIds) || selectedOrderIds.length === 0) {
            return NextResponse.json(
                { error: 'No order IDs provided' },
                { status: 400 }
            );
        }

        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiller')
            .select('rol')
            .eq('id', user.id)
            .single();

        // Build query
        let query = supabase
            .from('siparisler')
            .select(
                `
                id,
                firma_id,
                firmalar (
                    id,
                    unvan,
                    adres,
                    sehir,
                    ilce,
                    posta_kodu,
                    google_maps_url
                )
                `
            );

        // Apply RLS-like filter for Personel (check as string since enum might not be updated)
        const rolStr = String(profile?.rol || '');
        if (rolStr === 'Personel') {
            query = query.eq('atanan_kisi_id', user.id);
        }

        const { data: siparisler, error: sipariError } = await query.in('id', selectedOrderIds);

        if (sipariError) {
            console.error('Error fetching siparisler:', sipariError);
            return NextResponse.json(
                { error: 'Failed to fetch orders', details: sipariError.message },
                { status: 500 }
            );
        }

        // Extract unique firmas
        const firmaMap = new Map();
        const firmas: any[] = [];

        if (siparisler) {
            siparisler.forEach((siparis: any) => {
                if (siparis.firmalar && !firmaMap.has(siparis.firmalar.id)) {
                    firmaMap.set(siparis.firmalar.id, true);
                    firmas.push(siparis.firmalar);
                }
            });
        }

        console.log(`Found ${firmas.length} unique firmas from ${siparisler?.length || 0} orders`);

        return NextResponse.json({
            firmas: firmas.sort((a, b) => (a.unvan || '').localeCompare(b.unvan || ''))
        });
    } catch (error) {
        console.error('Error in get-firmalar API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
