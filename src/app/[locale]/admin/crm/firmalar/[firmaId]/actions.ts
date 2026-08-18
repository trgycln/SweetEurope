// src/app/[locale]/admin/crm/firmalar/[firmaId]/actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers';
import { puanOnerisi, PUANLAMA_ARALIK, ANA_KATEGORILER } from "@/lib/crm/kategoriYonetimi";
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

type FirmaStatus = Enums<'firma_status'>;
type FirmaKategorie = Enums<'firma_kategori'>;

type UpdateFirmaResult = {
    success: boolean;
    data?: Tables<'firmalar'>;
    error?: string;
};

export async function updateFirmaAction(
    firmaId: string,
    oncekiStatus: FirmaStatus | null,
    formData: FormData
): Promise<UpdateFirmaResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return { success: false, error: "Nicht authentifiziert." };

    const unvan = formData.get('unvan') as string | null;
    const kategorie = formData.get('kategori') as FirmaKategorie | null;
    const yeniStatus = formData.get('status') as FirmaStatus | null;
    const adres = formData.get('adres') as string | null;
    const telefon = formData.get('telefon') as string | null;
    const email = formData.get('email') as string | null;
    const oncelik_puani_raw = formData.get('oncelik_puani') as string | null;
    const instagram_url = formData.get('instagram_url') as string | null;
    const linkedin_url = formData.get('linkedin_url') as string | null;
    const facebook_url = formData.get('facebook_url') as string | null;
    const web_url = formData.get('web_url') as string | null;
    const google_maps_url = formData.get('google_maps_url') as string | null;
    const sehir = formData.get('sehir') as string | null;
    const ilce = formData.get('ilce') as string | null;
    const mahalle = formData.get('mahalle') as string | null;
    const posta_kodu = formData.get('posta_kodu') as string | null;
    const yetkili_kisi = formData.get('yetkili_kisi') as string | null;
    const etiketler = formData.getAll('etiketler') as string[];
    const kaynak = formData.get('kaynak') as string | null;
    const pricing_tier_raw = formData.get('pricing_tier') as string | null;
    const ticari_tip_raw = formData.get('ticari_tip') as string | null;
    const sahip_id_raw = formData.get('sahip_id') as string | null;
    const parent_firma_id = formData.get('parent_firma_id') as string | null;
    const referans_olarak_goster = formData.get('referans_olarak_goster') === 'on';
    const inherit_web_url = formData.get('inherit_web_url') === 'on';
    const inherit_instagram_url = formData.get('inherit_instagram_url') === 'on';
    const inherit_linkedin_url = formData.get('inherit_linkedin_url') === 'on';
    const inherit_facebook_url = formData.get('inherit_facebook_url') === 'on';
    const inherit_google_maps_url = formData.get('inherit_google_maps_url') === 'on';

    const isletme_tipi = formData.get('isletme_tipi') as string | null;
    const koltuk_sayisi_raw = formData.get('koltuk_sayisi') as string | null;
    const tercihli_urun_gami = formData.getAll('tercihli_urun_gami') as string[];
    const odeme_yontemi = formData.get('odeme_yontemi') as string | null;
    const odeme_vadesi_gun_raw = formData.get('odeme_vadesi_gun') as string | null;
    const siparis_periyodu_gun_raw = formData.get('siparis_periyodu_gun') as string | null;
    const rakip_kullaniyor_mu = formData.get('rakip_kullaniyor_mu') === 'on';
    const rakip_marka = formData.get('rakip_marka') as string | null;
    const isletme_notlar = formData.get('isletme_notlar') as string | null;
    const satis_stratejisi = formData.get('satis_stratejisi') as string | null;
    const tahmini_aylik_potansiyel_eur_raw = formData.get('tahmini_aylik_potansiyel_eur') as string | null;
    const crosssell_firsati = formData.get('crosssell_firsati') as string | null;
    const churn_riski = formData.get('churn_riski') === 'on';
    const churn_neden = formData.get('churn_neden') as string | null;

    if (!unvan) {
        return { success: false, error: "Firmenname darf nicht leer sein." };
    }
    const validStatusOptions: ReadonlyArray<FirmaStatus> = [
        "ADAY",
        "TEMAS EDİLDİ",
        "NUMUNE VERİLDİ",
        "MÜŞTERİ",
        "REDDEDİLDİ"
    ];
    if (yeniStatus && !validStatusOptions.includes(yeniStatus)) {
         return { success: false, error: `Ungültiger Status: ${yeniStatus}` };
    }

    const updatedData: any = {};
    if (unvan) updatedData.unvan = unvan;
    if (kategorie) updatedData.kategori = kategorie; else updatedData.kategori = null;
    if (yeniStatus) updatedData.status = yeniStatus;
    if (adres) updatedData.adres = adres; else updatedData.adres = null;
    if (telefon) updatedData.telefon = telefon; else updatedData.telefon = null;
    if (email) updatedData.email = email; else updatedData.email = null;
    if (instagram_url) updatedData.instagram_url = instagram_url; else updatedData.instagram_url = null;
    if (linkedin_url) updatedData.linkedin_url = linkedin_url; else updatedData.linkedin_url = null;
    if (facebook_url) updatedData.facebook_url = facebook_url; else updatedData.facebook_url = null;
    if (web_url) updatedData.web_url = web_url; else updatedData.web_url = null;
    if (google_maps_url) updatedData.google_maps_url = google_maps_url; else updatedData.google_maps_url = null;
    if (sehir) updatedData.sehir = sehir; else updatedData.sehir = null;
    if (ilce) updatedData.ilce = ilce; else updatedData.ilce = null;
    if (mahalle) updatedData.mahalle = mahalle; else updatedData.mahalle = null;
    if (posta_kodu) updatedData.posta_kodu = posta_kodu; else updatedData.posta_kodu = null;
    if (yetkili_kisi) updatedData.yetkili_kisi = yetkili_kisi; else updatedData.yetkili_kisi = null;
    if (etiketler && etiketler.length > 0) updatedData.etiketler = etiketler; else updatedData.etiketler = null;
    updatedData.pricing_tier = pricing_tier_raw || null;
    if (kaynak) updatedData.kaynak = kaynak; else updatedData.kaynak = null;
    if (kategorie) {
        updatedData.ticari_tip = ticari_tip_raw || (kategorie === 'Alt Bayi' ? 'alt_bayi' : 'musteri');
    }
    if (sahip_id_raw !== null) {
        updatedData.sahip_id = sahip_id_raw || null;
    }
    if (parent_firma_id !== null) {
        updatedData.parent_firma_id = parent_firma_id || null;
    }
    updatedData.inherit_web_url = inherit_web_url;
    updatedData.inherit_instagram_url = inherit_instagram_url;
    updatedData.inherit_linkedin_url = inherit_linkedin_url;
    updatedData.inherit_facebook_url = inherit_facebook_url;
    updatedData.inherit_google_maps_url = inherit_google_maps_url;
    
    let oncelik_puani: number | null = null;
    if (oncelik_puani_raw && /^\d+$/.test(oncelik_puani_raw)) {
        const parsedScore = parseInt(oncelik_puani_raw, 10);
        if (parsedScore > 0 && parsedScore <= 100) {
            oncelik_puani = parsedScore;
        } else {
            if (kategorie && PUANLAMA_ARALIK[kategorie as any]) {
                oncelik_puani = PUANLAMA_ARALIK[kategorie as any].ort;
            }
        }
    } else if (kategorie && PUANLAMA_ARALIK[kategorie as any]) {
        oncelik_puani = puanOnerisi(kategorie as any);
    }

    if (oncelik_puani !== null) {
        updatedData.oncelik_puani = oncelik_puani;
    }

    updatedData.referans_olarak_goster = referans_olarak_goster;
    updatedData.updated_by = user.id;

    const { data: mevcutFirmaData } = await supabase
        .from('firmalar')
        .select('teknik_ozellikler')
        .eq('id', firmaId)
        .single();
    const mevcutTeknikOzellikler = (mevcutFirmaData as any)?.teknik_ozellikler || {};
    updatedData.teknik_ozellikler = {
        ...mevcutTeknikOzellikler,
        isletme_tipi: isletme_tipi || null,
        koltuk_sayisi: koltuk_sayisi_raw ? parseInt(koltuk_sayisi_raw, 10) : null,
        tercihli_urun_gami: tercihli_urun_gami.length > 0 ? tercihli_urun_gami : [],
        odeme_yontemi: odeme_yontemi || null,
        odeme_vadesi_gun: odeme_vadesi_gun_raw !== null && odeme_vadesi_gun_raw !== '' ? parseInt(odeme_vadesi_gun_raw, 10) : null,
        siparis_periyodu_gun: siparis_periyodu_gun_raw ? parseInt(siparis_periyodu_gun_raw, 10) : null,
        rakip_kullaniyor_mu,
        rakip_marka: rakip_kullaniyor_mu ? (rakip_marka || null) : null,
        notlar: isletme_notlar || null,
        satis_stratejisi: satis_stratejisi || null,
        tahmini_aylik_potansiyel_eur: tahmini_aylik_potansiyel_eur_raw ? parseFloat(tahmini_aylik_potansiyel_eur_raw) : null,
        crosssell_firsati: crosssell_firsati || null,
        churn_riski,
        churn_neden: churn_riski ? (churn_neden || null) : null,
    };

    const promises: any[] = [];

    const updatePromise = supabase
        .from('firmalar')
        .update(updatedData)
        .eq('id', firmaId)
        .select()
        .single();
    promises.push(updatePromise as any);

    if (yeniStatus && yeniStatus !== oncekiStatus) {
        console.log(`Statusänderung erkannt für Firma ${firmaId}: ${oncekiStatus} -> ${yeniStatus}`);

        const logPromise = supabase.from('etkinlikler').insert({
            firma_id: firmaId,
            olusturan_personel_id: user.id,
            etkinlik_tipi: 'Not',
            aciklama: `Status von '${oncekiStatus || 'Unbekannt'}' zu '${yeniStatus}' geändert.`
        } as any);
        promises.push(logPromise as any);

        const bildirimMesaj = `Ihr Firmenstatus wurde zu "${yeniStatus}" geändert.`;
        const bildirimLink = `/portal/dashboard`;
        promises.push(sendNotification({
            aliciFirmaId: firmaId,
            icerik: bildirimMesaj,
            link: bildirimLink,
            supabaseClient: supabase
        }));
    }

    try {
        const results = await Promise.all(promises);
        const updateResult: any = results[0];

        if (updateResult?.error) {
            console.error("Fehler beim Firma-Update (DB):", updateResult.error);
            throw updateResult.error;
        }

        if (yeniStatus && yeniStatus !== oncekiStatus) {
            if (results[1] && (results[1] as any).error) {
                 console.warn(`Firma ${firmaId} aktualisiert, aber Aktivitätslog fehlgeschlagen:`, (results[1] as any).error);
            }
            if (results[2]) {
                 const notificationResult = results[2] as { success: boolean, error?: any };
                 if (!notificationResult.success) {
                     console.warn(`Firma ${firmaId} aktualisiert, aber Benachrichtigung fehlgeschlagen:`, notificationResult.error);
                 } else {
                     console.log(`Benachrichtigung für Firma ${firmaId} erfolgreich gesendet.`);
                 }
            }
        }

        revalidatePath('/admin/crm/firmalar');
        revalidatePath(`/admin/crm/firmalar/${firmaId}`);
        if (yeniStatus && yeniStatus !== oncekiStatus) {
             revalidatePath(`/admin/crm/firmalar/${firmaId}/etkinlikler`);
        }

        console.log(`Firma ${firmaId} erfolgreich aktualisiert.`);
        return { success: true, data: updateResult?.data };

    } catch (error: any) {
        console.error("Fehler in updateFirmaAction Promise.all:", error);
        return { success: false, error: "Update fehlgeschlagen: " + error.message };
    }
}

export async function deleteFirmaAction(
    firmaId: string,
    locale: string
): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return { success: false, error: 'Nicht authentifiziert.' };

    const { error } = await supabase
        .from('firmalar')
        .delete()
        .eq('id', firmaId);

    if (error) {
        console.error('Firma silme hatası:', error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/${locale}/admin/crm/firmalar`);
    return { success: true };
}