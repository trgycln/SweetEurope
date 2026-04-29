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

    // Get the record to find storage path
    const { data: belge } = await supabase
        .from('belgeler')
        .select('id, dosya_url')
        .eq('id', id)
        .single();

    if (!belge) {
        return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });
    }

    // Delete from storage if file exists
    if (belge.dosya_url) {
        const url = new URL(belge.dosya_url);
        const pathParts = url.pathname.split('/belgeler/');
        if (pathParts.length > 1) {
            await supabase.storage.from('belgeler').remove([pathParts[1]]);
        }
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
            id, ad, kategori, alt_kategori, dosya_url, dosya_boyutu, dosya_tipi,
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

// Upload a file to an existing pending belge record
export async function PUT(
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
        return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'Dosya 50 MB sınırını aşıyor' }, { status: 400 });
    }

    const fileBytes = await file.arrayBuffer();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${user.id}/uploads/${timestamp}-${safeName}`;

    const { error: storageError } = await supabase.storage
        .from('belgeler')
        .upload(filePath, fileBytes, { contentType: file.type, upsert: false });

    if (storageError) {
        return NextResponse.json({ error: 'Depolama hatası', details: storageError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('belgeler').getPublicUrl(filePath);

    const { data, error: dbError } = await supabase
        .from('belgeler')
        .update({
            dosya_url: urlData.publicUrl,
            dosya_boyutu: file.size,
            dosya_tipi: file.type,
        })
        .eq('id', id)
        .select(`
            id, ad, kategori, alt_kategori, dosya_url, dosya_boyutu, dosya_tipi,
            iliski_tipi, iliski_id, firma_id, tir_id, aciklama, etiketler,
            son_gecerlilik_tarihi, yukleyen_id, olusturma_tarihi, gizli, otomatik_eklendi,
            firma:firmalar(unvan),
            tir:ithalat_partileri(referans_kodu)
        `)
        .single();

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, belge: data });
}
