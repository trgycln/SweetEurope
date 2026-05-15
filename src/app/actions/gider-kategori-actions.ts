// @ts-nocheck
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

type Result = { success: boolean; message: string; error?: string };

async function getAuthedAdmin() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.', supabase: null, user: null };
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') return { error: 'Nur Administratoren erlaubt.', supabase: null, user: null };
    return { error: null, supabase, user };
}

// ── Ana Kategoriler ─────────────────────────────────────────
export async function createAnaKategori(ad: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };
    if (!ad || ad.trim().length < 2) return { success: false, message: '', error: 'Kategori adı en az 2 karakter olmalı.' };

    const { error } = await auth.supabase.from('gider_ana_kategoriler').insert({ ad: ad.trim() });
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Ana kategori eklendi.' };
}

export async function updateAnaKategori(id: string, ad: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };
    if (!ad || ad.trim().length < 2) return { success: false, message: '', error: 'Kategori adı en az 2 karakter olmalı.' };

    const { error } = await auth.supabase.from('gider_ana_kategoriler').update({ ad: ad.trim() }).eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Ana kategori güncellendi.' };
}

export async function deleteAnaKategori(id: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    // Kontrol: bu kategoride kalem var mı
    const { count } = await auth.supabase
        .from('gider_kalemleri')
        .select('id', { count: 'exact', head: true })
        .eq('ana_kategori_id', id);

    if ((count ?? 0) > 0) {
        return { success: false, message: '', error: `Bu kategoride ${count} alt kalem var. Önce onları silin veya taşıyın.` };
    }

    const { error } = await auth.supabase.from('gider_ana_kategoriler').delete().eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Ana kategori silindi.' };
}

// ── Gider Kalemleri ─────────────────────────────────────────
export async function createGiderKalemi(ad: string, ana_kategori_id: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };
    if (!ad || ad.trim().length < 2) return { success: false, message: '', error: 'Kalem adı en az 2 karakter olmalı.' };
    if (!ana_kategori_id) return { success: false, message: '', error: 'Ana kategori seçilmeli.' };

    const { error } = await auth.supabase.from('gider_kalemleri').insert({ ad: ad.trim(), ana_kategori_id });
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Kalem eklendi.' };
}

export async function updateGiderKalemi(id: string, ad: string, ana_kategori_id: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };
    if (!ad || ad.trim().length < 2) return { success: false, message: '', error: 'Kalem adı en az 2 karakter olmalı.' };

    const { error } = await auth.supabase.from('gider_kalemleri').update({ ad: ad.trim(), ana_kategori_id }).eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Kalem güncellendi.' };
}

export async function deleteGiderKalemi(id: string): Promise<Result> {
    const auth = await getAuthedAdmin();
    if (auth.error || !auth.supabase) return { success: false, message: '', error: auth.error || 'Auth' };

    // Bu kaleme bağlı gider var mı?
    const { count } = await auth.supabase
        .from('giderler')
        .select('id', { count: 'exact', head: true })
        .eq('gider_kalemi_id', id);

    if ((count ?? 0) > 0) {
        return { success: false, message: '', error: `Bu kaleme bağlı ${count} gider kaydı var. Silemezsiniz.` };
    }

    const { error } = await auth.supabase.from('gider_kalemleri').delete().eq('id', id);
    if (error) return { success: false, message: '', error: error.message };

    revalidatePath('/admin/idari/finans/giderler/kategoriler');
    revalidatePath('/admin/idari/finans/giderler');
    return { success: true, message: 'Kalem silindi.' };
}
