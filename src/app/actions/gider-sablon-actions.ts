// @ts-nocheck
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

type Result = { success: boolean; message: string; error?: string; count?: number };

async function getAuthed() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.', supabase: null, user: null };
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol ?? '')) {
        return { error: 'Yetkisiz.', supabase: null, user: null };
    }
    return { error: null, supabase, user, isAdmin: profile?.rol === 'Yönetici' };
}

export type SablonInput = {
    sablon_adi: string;
    tip: 'sureli_tekrar' | 'sureli_sozlesme' | 'taksitli';
    gider_kalemi_id: string | null;
    varsayilan_tutar: number;
    tekrar_periyodu: 'aylik' | 'ceyreklik' | 'yarim_yillik' | 'yillik';
    baslangic_tarihi: string;          // 'YYYY-MM-DD'
    bitis_tarihi?: string | null;       // sureli_sozlesme için
    taksit_sayisi?: number | null;      // taksitli için
    aciklama?: string | null;
    notlar?: string | null;
};

// ── Şablon CRUD ─────────────────────────────────────────────
export async function createSablonV2(input: SablonInput): Promise<Result> {
    const auth = await getAuthed();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    // Doğrulama
    if (!input.sablon_adi?.trim()) return { success: false, message: '', error: 'Şablon adı gerekli.' };
    if (!input.gider_kalemi_id) return { success: false, message: '', error: 'Kategori seçilmeli.' };
    if (!input.varsayilan_tutar || input.varsayilan_tutar <= 0) return { success: false, message: '', error: 'Tutar 0\'dan büyük olmalı.' };
    if (!input.baslangic_tarihi) return { success: false, message: '', error: 'Başlangıç tarihi gerekli.' };

    if (input.tip === 'sureli_sozlesme' && !input.bitis_tarihi) {
        return { success: false, message: '', error: 'Süreli sözleşme için bitiş tarihi gerekli.' };
    }
    if (input.tip === 'taksitli' && (!input.taksit_sayisi || input.taksit_sayisi < 1)) {
        return { success: false, message: '', error: 'Taksit sayısı 1\'den büyük olmalı.' };
    }

    const insertData = {
        sablon_adi: input.sablon_adi.trim(),
        tip: input.tip,
        gider_kalemi_id: input.gider_kalemi_id,
        varsayilan_tutar: input.varsayilan_tutar,
        tutar: input.varsayilan_tutar, // legacy uyum
        tekrar_periyodu: input.tekrar_periyodu,
        donem_tipi: input.tekrar_periyodu, // legacy uyum
        baslangic_tarihi: input.baslangic_tarihi,
        bitis_tarihi: input.tip === 'sureli_sozlesme' ? input.bitis_tarihi : null,
        taksit_sayisi: input.tip === 'taksitli' ? input.taksit_sayisi : null,
        aciklama: input.aciklama || null,
        notlar: input.notlar || null,
        aktif: true,
    };

    const { error } = await auth.supabase.from('gider_sablonlari').insert(insertData);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/sablonlar');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Şablon oluşturuldu.' };
}

export async function updateSablonV2(id: string, input: SablonInput): Promise<Result> {
    const auth = await getAuthed();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    const updateData = {
        sablon_adi: input.sablon_adi.trim(),
        tip: input.tip,
        gider_kalemi_id: input.gider_kalemi_id,
        varsayilan_tutar: input.varsayilan_tutar,
        tutar: input.varsayilan_tutar,
        tekrar_periyodu: input.tekrar_periyodu,
        donem_tipi: input.tekrar_periyodu,
        baslangic_tarihi: input.baslangic_tarihi,
        bitis_tarihi: input.tip === 'sureli_sozlesme' ? input.bitis_tarihi : null,
        taksit_sayisi: input.tip === 'taksitli' ? input.taksit_sayisi : null,
        aciklama: input.aciklama || null,
        notlar: input.notlar || null,
    };

    const { error } = await auth.supabase.from('gider_sablonlari').update(updateData).eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/sablonlar');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Şablon güncellendi.' };
}

export async function deleteSablonV2(id: string): Promise<Result> {
    const auth = await getAuthed();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    const { error } = await auth.supabase.from('gider_sablonlari').delete().eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/sablonlar');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Şablon silindi.' };
}

export async function toggleSablonV2(id: string, aktif: boolean): Promise<Result> {
    const auth = await getAuthed();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    const { error } = await auth.supabase.from('gider_sablonlari').update({ aktif }).eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/sablonlar');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: aktif ? 'Şablon aktifleştirildi.' : 'Şablon devre dışı bırakıldı.' };
}

// ── Otomatik üretim: aktif şablonlardan ayın giderlerini oluştur ────
export async function generateExpensesForMonth(yearMonth: string): Promise<Result> {
    const auth = await getAuthed();
    if (auth.error || !auth.supabase || !auth.user) return { success: false, message: '', error: auth.error || 'Auth' };

    const [year, month] = yearMonth.split('-').map(Number);
    if (!year || !month) return { success: false, message: '', error: 'Geçersiz ay formatı.' };

    // Ayın ilk günü
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Aktif şablonları çek
    const { data: templates, error: tmplErr } = await auth.supabase
        .from('gider_sablonlari')
        .select('*')
        .eq('aktif', true);

    if (tmplErr) return { success: false, message: '', error: tmplErr.message };
    if (!templates || templates.length === 0) {
        return { success: false, message: '', error: 'Aktif şablon bulunamadı.' };
    }

    // Bu ay için zaten oluşturulmuş gider var mı? (dup kontrolü)
    const sablonIds = templates.map((t: any) => t.id);
    const { data: existing } = await auth.supabase
        .from('giderler')
        .select('sablon_id')
        .in('sablon_id', sablonIds)
        .gte('tarih', firstDayStr)
        .lte('tarih', lastDayStr);

    const existingSablonIds = new Set((existing ?? []).map((e: any) => e.sablon_id));

    const toInsert: any[] = [];
    const skipped: string[] = [];
    const expired: string[] = [];

    for (const t of templates as any[]) {
        // Zaten oluşturulmuşsa atla
        if (existingSablonIds.has(t.id)) {
            skipped.push(t.sablon_adi);
            continue;
        }

        // Başlangıç tarihi gelmediyse atla
        if (t.baslangic_tarihi && t.baslangic_tarihi > lastDayStr) continue;

        // Periyot kontrolü (aylık değilse, doğru ay mı?)
        if (t.tekrar_periyodu && t.tekrar_periyodu !== 'aylik' && t.baslangic_tarihi) {
            const startDate = new Date(t.baslangic_tarihi);
            const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - 1 - startDate.getMonth());

            let interval = 1;
            if (t.tekrar_periyodu === 'ceyreklik') interval = 3;
            else if (t.tekrar_periyodu === 'yarim_yillik') interval = 6;
            else if (t.tekrar_periyodu === 'yillik') interval = 12;

            if (monthsDiff < 0 || monthsDiff % interval !== 0) continue;
        }

        // Süreli sözleşme bitti mi?
        if (t.tip === 'sureli_sozlesme' && t.bitis_tarihi && t.bitis_tarihi < firstDayStr) {
            expired.push(t.sablon_adi);
            continue;
        }

        // Taksit doldu mu?
        if (t.tip === 'taksitli' && t.taksit_sayisi && t.baslangic_tarihi) {
            const { count: usedCount } = await auth.supabase
                .from('giderler')
                .select('id', { count: 'exact', head: true })
                .eq('sablon_id', t.id);
            if ((usedCount ?? 0) >= t.taksit_sayisi) {
                expired.push(t.sablon_adi);
                continue;
            }
        }

        toInsert.push({
            tarih: firstDayStr,
            tutar: t.varsayilan_tutar ?? t.tutar ?? 0,
            aciklama: t.aciklama || t.sablon_adi,
            gider_kalemi_id: t.gider_kalemi_id,
            durum: 'Taslak',
            kaynak: 'sablon',
            sablon_id: t.id,
            otomatik_eklendi: true,
            tekrar_tipi: t.tekrar_periyodu || 'aylik',
            islem_yapan_kullanici_id: auth.user.id,
        });
    }

    if (toInsert.length === 0) {
        return {
            success: true,
            message: `Bu ay için yeni gider oluşturulmadı. (${skipped.length} zaten var, ${expired.length} süresi dolmuş)`,
            count: 0,
        };
    }

    const { error: insErr } = await auth.supabase.from('giderler').insert(toInsert);
    if (insErr) return { success: false, message: '', error: insErr.message };

    // Şablonların son_olusturma_tarihi güncelle
    for (const t of toInsert) {
        await auth.supabase
            .from('gider_sablonlari')
            .update({ son_olusturma_tarihi: firstDayStr })
            .eq('id', t.sablon_id);
    }

    // Süresi bitenleri pasifleştir
    if (expired.length > 0) {
        for (const t of templates as any[]) {
            if (!expired.includes(t.sablon_adi)) continue;
            await auth.supabase.from('gider_sablonlari').update({ aktif: false }).eq('id', t.id);
        }
    }

    revalidatePath('/admin/idari/finans/giderler/sablonlar');
    revalidatePath('/admin/idari/finans/giderler');

    return {
        success: true,
        message: `${toInsert.length} taslak gider oluşturuldu` +
            (expired.length > 0 ? ` · ${expired.length} şablon süresi doldu (pasifleşti)` : ''),
        count: toInsert.length,
    };
}
