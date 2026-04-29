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
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const ad = formData.get('ad') as string;
        const kategori = formData.get('kategori') as string;
        const altKategori = formData.get('alt_kategori') as string | null;
        const firmaId = formData.get('firma_id') as string | null;
        const tirId = formData.get('tir_id') as string | null;
        const sonGecerlilikTarihi = formData.get('son_gecerlilik_tarihi') as string | null;
        const aciklama = formData.get('aciklama') as string | null;
        const gizli = formData.get('gizli') === 'true';
        const etiketlerRaw = formData.get('etiketler') as string | null;
        const tedarikciAdi = formData.get('tedarikci_adi') as string | null;

        if (!ad || !kategori) {
            return NextResponse.json({ error: 'ad ve kategori zorunludur' }, { status: 400 });
        }

        const etiketler = etiketlerRaw
            ? etiketlerRaw.split(',').map(t => t.trim()).filter(Boolean)
            : [];

        let dosyaUrl: string | null = null;
        let dosyaBoyutu: number | null = null;
        let dosyaTipi: string | null = null;

        if (file && file.size > 0) {
            if (file.size > 50 * 1024 * 1024) {
                return NextResponse.json({ error: 'Dosya boyutu 50 MB sınırını aşıyor' }, { status: 400 });
            }

            const fileBytes = await file.arrayBuffer();
            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = `${user.id}/${kategori}/${timestamp}-${safeName}`;

            // belgeler bucket'ını dene; yoksa mevcut documents bucket'ına fallback yap
            const BUCKET_CANDIDATES = ['belgeler', 'documents'];
            let uploadedBucket: string | null = null;
            let lastStorageError: { message: string } | null = null;

            for (const bucket of BUCKET_CANDIDATES) {
                const { error: storageError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, fileBytes, {
                        contentType: file.type,
                        upsert: false,
                    });

                if (!storageError) {
                    uploadedBucket = bucket;
                    break;
                }
                lastStorageError = storageError;
            }

            if (!uploadedBucket) {
                return NextResponse.json({
                    error: 'Dosya yüklenemedi',
                    details: lastStorageError?.message ?? 'Storage bucket bulunamadı. Supabase Storage\'da "belgeler" veya "documents" bucket oluşturun.',
                }, { status: 500 });
            }

            const { data: urlData } = supabase.storage
                .from(uploadedBucket)
                .getPublicUrl(filePath);

            dosyaUrl = urlData.publicUrl;
            dosyaBoyutu = file.size;
            dosyaTipi = file.type;
        }

        const { data: belge, error: dbError } = await supabase
            .from('belgeler')
            .insert({
                ad,
                kategori,
                alt_kategori: altKategori || null,
                dosya_url: dosyaUrl,
                dosya_boyutu: dosyaBoyutu,
                dosya_tipi: dosyaTipi,
                firma_id: firmaId || null,
                tir_id: tirId || null,
                aciklama: aciklama || null,
                etiketler,
                son_gecerlilik_tarihi: sonGecerlilikTarihi || null,
                yukleyen_id: user.id,
                gizli,
                otomatik_eklendi: false,
                tedarikci_adi: tedarikciAdi || null,
            })
            .select(`
                id, ad, kategori, alt_kategori, dosya_url, dosya_boyutu, dosya_tipi,
                iliski_tipi, iliski_id, firma_id, tir_id, aciklama, etiketler,
                son_gecerlilik_tarihi, yukleyen_id, olusturma_tarihi, gizli, otomatik_eklendi,
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
