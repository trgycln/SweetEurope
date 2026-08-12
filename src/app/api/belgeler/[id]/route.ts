import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: dbError } = await supabase
        .from('belgeler')
        .delete()
        .eq('id', id);

    if (dbError) {
        return NextResponse.json({ error: 'Silme hatası', details: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = [
        'ad', 'kategori', 'alt_kategori', 'tedarikci_adi',
        'aciklama', 'son_gecerlilik_tarihi', 'etiketler',
        'gizli', 'firma_id', 'tir_id',
        'sira_no', 'evrak_tarihi'
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
        if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
        .from('belgeler')
        .update(updates)
        .eq('id', id)
        .select(`
            id, ad, kategori, alt_kategori, sira_no, evrak_tarihi,
            iliski_tipi, iliski_id, firma_id, tir_id, aciklama, etiketler,
            son_gecerlilik_tarihi, yukleyen_id, olusturma_tarihi, gizli, otomatik_eklendi, tedarikci_adi,
            firma:firmalar(unvan),
            tir:ithalat_partileri(referans_kodu)
        `)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, belge: data });
}
