import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            ad, kategori, alt_kategori, sira_no, evrak_tarihi,
            firma_id, tir_id, son_gecerlilik_tarihi, aciklama, gizli, etiketler: etiketlerRaw, tedarikci_adi
        } = body;

        if (!ad || !kategori) {
            return NextResponse.json({ error: 'ad ve kategori zorunludur' }, { status: 400 });
        }

        const etiketler = etiketlerRaw
            ? etiketlerRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];

        const { data: belge, error: dbError } = await supabase
            .from('belgeler' as any)
            .insert({
                ad,
                kategori,
                alt_kategori: alt_kategori || null,
                sira_no: sira_no || null,
                evrak_tarihi: evrak_tarihi || null,
                firma_id: firma_id || null,
                tir_id: tir_id || null,
                aciklama: aciklama || null,
                etiketler,
                son_gecerlilik_tarihi: son_gecerlilik_tarihi || null,
                yukleyen_id: user.id,
                gizli: !!gizli,
                otomatik_eklendi: false,
                tedarikci_adi: tedarikci_adi || null,
            })
            .select(`
                id, ad, kategori, alt_kategori, sira_no, evrak_tarihi,
                iliski_tipi, iliski_id, firma_id, tir_id, aciklama, etiketler,
                son_gecerlilik_tarihi, yukleyen_id, olusturma_tarihi, gizli, otomatik_eklendi, tedarikci_adi,
                firma:firmalar(unvan),
                tir:ithalat_partileri(referans_kodu)
            `)
            .single();

        if (dbError) {
            return NextResponse.json({
                error: 'Veritabanı hatası',
                details: dbError.message,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, belge });
    } catch (err) {
        return NextResponse.json({
            error: 'Sunucu hatası',
            details: err instanceof Error ? err.message : 'Bilinmeyen hata',
        }, { status: 500 });
    }
}
