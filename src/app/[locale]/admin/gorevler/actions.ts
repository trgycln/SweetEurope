// src/app/[locale]/admin/gorevler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Enums, TablesUpdate } from '@/lib/supabase/database.types';
import { sendNotification } from '@/lib/notificationUtils';

type ActionResult = {
    success?: string;
    error?: string;
};

type GorevOncelik = Enums<'gorev_oncelik'>;

const VALID_PRIORITIES: GorevOncelik[] = ['Düşük', 'Orta', 'Yüksek'];

async function getAuthenticatedClient() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return { supabase, user };
}

function revalidateTaskPaths(locale?: string, firmaId?: string | null) {
    revalidatePath('/admin/gorevler');
    revalidatePath('/admin/dashboard');

    if (locale) {
        revalidatePath(`/${locale}/admin/gorevler`);
        revalidatePath(`/${locale}/admin/dashboard`);

        if (firmaId) {
            revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`);
        }
    }
}

function getTaskDetailLink(gorevId: string, locale?: string) {
    return locale ? `/${locale}/admin/gorevler/${gorevId}` : `/admin/gorevler/${gorevId}`;
}

export async function gorevDurumGuncelleAction(
    gorevId: string,
    yeniDurum: boolean,
    locale?: string
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }

    const { data: mevcutGorev } = await supabase
        .from('gorevler')
        .select('ilgili_firma_id, baslik, atanan_kisi_id, olusturan_kisi_id')
        .eq('id', gorevId)
        .maybeSingle();

    const { error } = await supabase
        .from('gorevler')
        .update({
            tamamlandi: yeniDurum,
            durum: yeniDurum ? 'Tamamlandı' : 'Yapılacak',
        })
        .eq('id', gorevId);

    if (error) {
        console.error('Fehler beim Aktualisieren des Aufgabenstatus:', error);
        return { error: 'Status konnte nicht aktualisiert werden.' };
    }

    const bildirimLink = getTaskDetailLink(gorevId, locale);
    const bildirimMesaji = `"${mevcutGorev?.baslik || 'Görev'}" görevi ${yeniDurum ? 'tamamlandı' : 'yeniden açıldı'}.`;
    const notificationPromises: Promise<unknown>[] = [];

    if (mevcutGorev?.atanan_kisi_id && mevcutGorev.atanan_kisi_id !== user.id) {
        notificationPromises.push(
            sendNotification({
                aliciId: mevcutGorev.atanan_kisi_id,
                icerik: bildirimMesaji,
                link: bildirimLink,
                preferenceKey: 'task_assignments',
                supabaseClient: supabase,
            })
        );
    }

    if (
        mevcutGorev?.olusturan_kisi_id &&
        mevcutGorev.olusturan_kisi_id !== user.id &&
        mevcutGorev.olusturan_kisi_id !== mevcutGorev.atanan_kisi_id
    ) {
        notificationPromises.push(
            sendNotification({
                aliciId: mevcutGorev.olusturan_kisi_id,
                icerik: bildirimMesaji,
                link: bildirimLink,
                preferenceKey: 'task_assignments',
                supabaseClient: supabase,
            })
        );
    }

    if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises);
    }

    revalidateTaskPaths(locale, mevcutGorev?.ilgili_firma_id ?? null);

    return {
        success: yeniDurum ? 'Aufgabe als erledigt markiert.' : 'Aufgabe wieder geöffnet.',
    };
}

export async function gorevAtananKisiGuncelleAction(
    gorevId: string,
    atananKisiId: string,
    locale?: string
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }

    const temizAtananKisiId = atananKisiId?.trim();
    if (!temizAtananKisiId) {
        return { error: 'Atanan personel seçilmelidir.' };
    }

    const { data: mevcutGorev } = await supabase
        .from('gorevler')
        .select('ilgili_firma_id, baslik, atanan_kisi_id')
        .eq('id', gorevId)
        .maybeSingle();

    const { error } = await supabase
        .from('gorevler')
        .update({
            atanan_kisi_id: temizAtananKisiId,
            sahip_id: temizAtananKisiId,
        })
        .eq('id', gorevId);

    if (error) {
        console.error('Fehler beim Aktualisieren der Personenzuweisung:', error);
        return { error: 'Personel ataması güncellenemedi.' };
    }

    if (temizAtananKisiId !== user.id && temizAtananKisiId !== mevcutGorev?.atanan_kisi_id) {
        await sendNotification({
            aliciId: temizAtananKisiId,
            icerik: `Size yeni bir görev atandı: "${mevcutGorev?.baslik || 'Görev'}"`,
            link: getTaskDetailLink(gorevId, locale),
            preferenceKey: 'task_assignments',
            supabaseClient: supabase,
        });
    }

    revalidateTaskPaths(locale, mevcutGorev?.ilgili_firma_id ?? null);

    return { success: 'Personel ataması güncellendi.' };
}

export async function gorevGuncelleAction(
    gorevId: string,
    data: {
        baslik: string;
        aciklama?: string | null;
        son_tarih?: string | null;
        atanan_kisi_id: string;
        ilgili_firma_id?: string | null;
        oncelik?: GorevOncelik;
        tamamlandi?: boolean;
    },
    locale?: string
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }

    const baslik = data.baslik?.trim();
    const atananKisiId = data.atanan_kisi_id?.trim();
    const sonTarihRaw = data.son_tarih?.trim();
    const parsedDate = sonTarihRaw ? new Date(sonTarihRaw) : null;

    if (!baslik) {
        return { error: 'Görev başlığı zorunludur.' };
    }

    if (!atananKisiId) {
        return { error: 'Atanan personel zorunludur.' };
    }

    if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        return { error: 'Geçerli bir son tarih girin.' };
    }

    const { data: mevcutGorev } = await supabase
        .from('gorevler')
        .select('ilgili_firma_id, baslik, atanan_kisi_id')
        .eq('id', gorevId)
        .maybeSingle();

    const updateData: TablesUpdate<'gorevler'> = {
        baslik,
        aciklama: data.aciklama?.trim() || null,
        son_tarih: parsedDate ? parsedDate.toISOString() : null,
        atanan_kisi_id: atananKisiId,
        sahip_id: atananKisiId,
        ilgili_firma_id: data.ilgili_firma_id?.trim() || null,
        oncelik: VALID_PRIORITIES.includes(data.oncelik as GorevOncelik) ? (data.oncelik as GorevOncelik) : 'Orta',
    };

    if (typeof data.tamamlandi === 'boolean') {
        updateData.tamamlandi = data.tamamlandi;
        updateData.durum = data.tamamlandi ? 'Tamamlandı' : 'Yapılacak';
    }

    const { error } = await supabase
        .from('gorevler')
        .update(updateData)
        .eq('id', gorevId);

    if (error) {
        console.error('Fehler beim Aktualisieren der Aufgabe:', error);
        return { error: 'Görev güncellenemedi.' };
    }

    if (atananKisiId !== user.id) {
        const yeniAtama = mevcutGorev?.atanan_kisi_id !== atananKisiId;
        await sendNotification({
            aliciId: atananKisiId,
            icerik: yeniAtama
                ? `Size güncellenmiş bir görev atandı: "${baslik}"`
                : `Göreviniz güncellendi: "${baslik}"`,
            link: getTaskDetailLink(gorevId, locale),
            preferenceKey: 'task_assignments',
            supabaseClient: supabase,
        });
    }

    revalidateTaskPaths(locale, updateData.ilgili_firma_id ?? null);

    return { success: 'Görev başarıyla güncellendi.' };
}

// ── Kanban: belirli bir duruma geçiş ─────────────────────────────────────────

export async function gorevDurumDegistirAction(
    gorevId: string,
    yeniDurum: 'Yapılacak' | 'Devam Ediyor' | 'Tamamlandı',
    locale?: string
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return { error: 'Oturum açık değil.' };

    const { error } = await supabase
        .from('gorevler')
        .update({
            durum: yeniDurum,
            tamamlandi: yeniDurum === 'Tamamlandı',
        })
        .eq('id', gorevId);

    if (error) {
        console.error('Durum değiştirme hatası:', error);
        return { error: 'Durum güncellenemedi.' };
    }

    revalidateTaskPaths(locale);
    return { success: `Görev "${yeniDurum}" olarak işaretlendi.` };
}

// ── Notlar ────────────────────────────────────────────────────────────────────

type GorevNot = {
    id: string;
    not_metni: string;
    olusturma_tarihi: string;
    kullanici_adi: string | null;
};

type AltGorev = {
    id: string;
    baslik: string;
    tamamlandi: boolean;
    olusturma_tarihi: string;
};

export async function fetchGorevDetayAction(gorevId: string): Promise<{
    notlar: GorevNot[];
    altGorevler: AltGorev[];
    error?: string;
}> {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return { notlar: [], altGorevler: [], error: 'Oturum açık değil.' };

    const [notlarRes, altRes] = await Promise.all([
        (supabase as any)
            .from('gorev_notlari')
            .select('id, not_metni, olusturma_tarihi, profiller(tam_ad)')
            .eq('gorev_id', gorevId)
            .order('olusturma_tarihi', { ascending: false }),
        (supabase as any)
            .from('alt_gorevler')
            .select('id, baslik, tamamlandi, olusturma_tarihi')
            .eq('gorev_id', gorevId)
            .order('olusturma_tarihi', { ascending: true }),
    ]);

    const notlar: GorevNot[] = (notlarRes.data || []).map((r: any) => ({
        id: r.id,
        not_metni: r.not_metni,
        olusturma_tarihi: r.olusturma_tarihi,
        kullanici_adi: r.profiller?.tam_ad ?? null,
    }));

    const altGorevler: AltGorev[] = (altRes.data || []).map((r: any) => ({
        id: r.id,
        baslik: r.baslik,
        tamamlandi: r.tamamlandi,
        olusturma_tarihi: r.olusturma_tarihi,
    }));

    return { notlar, altGorevler };
}

export async function addGorevNotuAction(
    gorevId: string,
    notMetni: string,
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return { error: 'Oturum açık değil.' };

    const metin = notMetni.trim();
    if (!metin) return { error: 'Not metni boş olamaz.' };

    const { error } = await (supabase as any)
        .from('gorev_notlari')
        .insert({ gorev_id: gorevId, kullanici_id: user.id, not_metni: metin });

    if (error) {
        console.error('Not ekleme hatası:', error);
        return { error: 'Not eklenemedi.' };
    }

    return { success: 'Not eklendi.' };
}

export async function addAltGorevAction(
    gorevId: string,
    baslik: string,
): Promise<ActionResult & { id?: string }> {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return { error: 'Oturum açık değil.' };

    const temiz = baslik.trim();
    if (!temiz) return { error: 'Alt görev başlığı boş olamaz.' };

    const { data, error } = await (supabase as any)
        .from('alt_gorevler')
        .insert({ gorev_id: gorevId, baslik: temiz })
        .select('id')
        .single();

    if (error) {
        console.error('Alt görev ekleme hatası:', error);
        return { error: 'Alt görev eklenemedi.' };
    }

    return { success: 'Alt görev eklendi.', id: data?.id };
}

export async function toggleAltGorevAction(
    altGorevId: string,
    tamamlandi: boolean,
): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return { error: 'Oturum açık değil.' };

    const { error } = await (supabase as any)
        .from('alt_gorevler')
        .update({ tamamlandi })
        .eq('id', altGorevId);

    if (error) {
        console.error('Alt görev güncelleme hatası:', error);
        return { error: 'Alt görev güncellenemedi.' };
    }

    return { success: tamamlandi ? 'Tamamlandı.' : 'Yeniden açıldı.' };
}

export async function gorevSilAction(gorevId: string, locale?: string): Promise<ActionResult> {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }

    const { data: mevcutGorev } = await supabase
        .from('gorevler')
        .select('ilgili_firma_id')
        .eq('id', gorevId)
        .maybeSingle();

    const { error } = await supabase.from('gorevler').delete().eq('id', gorevId);

    if (error) {
        console.error('Fehler beim Löschen der Aufgabe:', error);
        return { error: 'Görev silinemedi.' };
    }

    revalidateTaskPaths(locale, mevcutGorev?.ilgili_firma_id ?? null);

    return { success: 'Görev silindi.' };
}