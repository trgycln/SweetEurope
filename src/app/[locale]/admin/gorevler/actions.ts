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