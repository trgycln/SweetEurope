import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const VARSAYILAN_KLASORLER = [
    { id: 'gelen_evrak_dosyasi', label: 'Gelen Evrak Dosyası', icon: '📥', sira: 10, varsayilan: true },
    { id: 'giden_evrak_dosyasi', label: 'Giden Evrak Dosyası', icon: '📤', sira: 20, varsayilan: true },
    { id: 'sozlesmeler_dosyasi', label: 'Sözleşmeler Dosyası', icon: '📋', sira: 30, varsayilan: true },
    { id: 'arac_dosyasi', label: 'Araç Dosyası & Evrakları', icon: '🚗', sira: 35, varsayilan: true },
    { id: 'kurulus_evraklari', label: 'Resmi Kuruluş Evrakları', icon: '🏛️', sira: 40, varsayilan: true },
    { id: 'personel_ozluk_dosyalari', label: 'Personel Özlük Dosyaları', icon: '👥', sira: 50, varsayilan: true },
    { id: 'sertifikalar', label: 'Sertifikalar (HACCP vs.)', icon: '🏅', sira: 60, varsayilan: true },
    { id: 'diger', label: 'Diğer Klasörler', icon: '📁', sira: 999, varsayilan: true },
];

function slugify(text: string): string {
    const trMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u'
    };
    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || `klasor_${Date.now()}`;
}

export async function GET() {
    const cookieStore = await cookies();
    const supabase: any = await createSupabaseServerClient(cookieStore);

    try {
        const { data: dbKlasorler, error } = await supabase
            .from('belge_klasorleri')
            .select('id, label, icon, sira, varsayilan')
            .order('sira', { ascending: true });

        // Tablo mevcutsa verileri alalım
        let klasorler: any[] = (dbKlasorler && !error) ? [...(dbKlasorler as any[])] : [...VARSAYILAN_KLASORLER];

        // Eğer veritabanında varsayılan klasörlerden eksik olan varsa ekleyelim
        const mevcutIds = new Set(klasorler.map((k: any) => k.id));
        for (const vk of VARSAYILAN_KLASORLER) {
            if (!mevcutIds.has(vk.id)) {
                klasorler.push(vk);
            }
        }

        // belgeler tablosunda kullanılan ama klasör listesinde olmayan kategorileri de dinamik ekle
        try {
            const { data: kullanilanlar } = await supabase
                .from('belgeler' as any)
                .select('kategori');

            if (kullanilanlar && Array.isArray(kullanilanlar)) {
                const uniqueCats = Array.from(new Set(kullanilanlar.map((b: any) => b.kategori).filter(Boolean)));
                for (const cat of uniqueCats) {
                    if (!klasorler.some((k: any) => k.id === cat)) {
                        const title = cat.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                        klasorler.push({
                            id: cat,
                            label: title,
                            icon: '📁',
                            sira: 500,
                            varsayilan: false
                        });
                    }
                }
            }
        } catch {
            // Sessizce yut
        }

        klasorler.sort((a: any, b: any) => (a.sira ?? 100) - (b.sira ?? 100));

        return NextResponse.json({ success: true, klasorler });
    } catch (err: any) {
        return NextResponse.json({ 
            success: true, 
            klasorler: VARSAYILAN_KLASORLER, 
            fallback: true, 
            warning: err?.message 
        });
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase: any = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { label, icon = '📁', id: customId } = body;

        if (!label || !label.trim()) {
            return NextResponse.json({ error: 'Klasör adı zorunludur' }, { status: 400 });
        }

        const id = customId?.trim() ? slugify(customId) : slugify(label);
        const cleanIcon = icon?.trim() || '📁';

        // Veritabanına ekleme dene
        const { data: yeniKlasor, error: insertError } = await supabase
            .from('belge_klasorleri' as any)
            .insert({
                id,
                label: label.trim(),
                icon: cleanIcon,
                sira: 80,
                varsayilan: false,
                olusturan_id: user.id
            })
            .select()
            .single();

        if (insertError) {
            // Tablo yoksa bile istemcinin kullanabilmesi için nesneyi dönelim
            if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
                return NextResponse.json({
                    success: true,
                    klasor: {
                        id,
                        label: label.trim(),
                        icon: cleanIcon,
                        sira: 80,
                        varsayilan: false
                    },
                    tableMissing: true,
                    message: 'Klasör geçici olarak oluşturuldu. Kalıcı olması için veritabanı migration SQL çalıştırılmalıdır.'
                });
            }

            if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
                return NextResponse.json({ error: 'Bu isimde veya kodda bir klasör zaten mevcut' }, { status: 400 });
            }

            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, klasor: yeniKlasor });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase: any = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Klasör ID zorunludur' }, { status: 400 });
        }

        // Varsayılan klasör mü?
        const isDefault = VARSAYILAN_KLASORLER.some(k => k.id === id);
        if (isDefault) {
            return NextResponse.json({ error: 'Sistem varsayılan klasörleri silinemez' }, { status: 400 });
        }

        // Klasörde evrak var mı?
        const { count, error: countError } = await supabase
            .from('belgeler' as any)
            .select('id', { count: 'exact', head: true })
            .eq('kategori', id);

        if (!countError && count && count > 0) {
            return NextResponse.json({ 
                error: `Bu klasörde ${count} adet kayıtlı evrak bulunmaktadır. Önce evrakları başka bir klasöre taşıyın veya silin.` 
            }, { status: 400 });
        }

        const { error: deleteError } = await supabase
            .from('belge_klasorleri' as any)
            .delete()
            .eq('id', id);

        if (deleteError && deleteError.code !== '42P01') {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, deletedId: id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 });
    }
}
