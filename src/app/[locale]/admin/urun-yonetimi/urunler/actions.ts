// src/app/[locale]/admin/urun-yonetimi/urunler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen)
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/supabase/database.types'; // Database importieren
import { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { slugify } from '@/lib/utils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

const diller = ['de', 'en', 'tr', 'ar'];
const PRODUCT_IMAGE_BUCKET = 'urun-gorselleri';
const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const PRODUCT_IMAGE_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// --- Hilfsfunktionen (unverändert) ---

// Findet einen einzigartigen Slug
async function findUniqueSlug(supabase: SupabaseClient<Database>, baseSlug: string, excludeId?: string ): Promise<string> {
    let currentSlug = slugify(baseSlug);
    if (!currentSlug) currentSlug = 'produkt';
    let originalSlug = currentSlug;
    let counter = 2;
    while (true) {
        let query = supabase.from('urunler').select('id', { count: 'exact', head: true }).eq('slug', currentSlug);
        if (excludeId) { query = query.neq('id', excludeId); }
        const { error, count } = await query;
        if (error) { console.error("Fehler bei findUniqueSlug Zählung:", error); return `${originalSlug}-${Date.now()}`; }
        if (count === 0) { return currentSlug; }
        else { currentSlug = `${originalSlug}-${counter}`; counter++; }
    }
}

// Wandelt FormData in ein Urun-Objekt um
function formDataToUrunObject(formData: FormData): TablesUpdate<'urunler'> {
    const parseInteger = (value: FormDataEntryValue | null): number | null => {
        if (value == null || String(value).trim() === '') return null;
        const parsed = Number.parseInt(String(value), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const parseDecimal = (value: FormDataEntryValue | null): number | null => {
        if (value == null || String(value).trim() === '') return null;
        const normalized = String(value).replace(',', '.');
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const adJson: { [key: string]: string } = {};
    const aciklamalarJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
        aciklamalarJson[dil] = formData.get(`aciklamalar_${dil}`) as string || '';
    });
    const galeriUrls = formData.has('galeri_resim_urls[]') ? formData.getAll('galeri_resim_urls[]') as string[] : [];
    const urunGami = ((formData.get('urun_gami') as string) || '').trim() || null;
    const kutuIciAdet = parseInteger(formData.get('kutu_ici_adet'));
    const koliIciKutuAdet = parseInteger(formData.get('koli_ici_kutu_adet'));
    const paletIciKoliAdet = parseInteger(formData.get('palet_ici_koli_adet'));
    const alisFiyatSeviyesi = ((formData.get('alis_fiyat_seviyesi') as string) || '').trim() || 'kutu';
    const birimAgirlikKg = parseDecimal(formData.get('birim_agirlik_kg'));
    const lojistikSinifi = ((formData.get('lojistik_sinifi') as string) || '').trim() || null;
    const gumrukVergiYuzde = parseDecimal(formData.get('gumruk_vergi_orani_yuzde'));
    const almanyaKdvOrani = parseDecimal(formData.get('almanya_kdv_orani'));
    const gunlukDepolamaMaliyeti = parseDecimal(formData.get('gunluk_depolama_maliyeti_eur'));
    const ortalamaStokGun = parseInteger(formData.get('ortalama_stokta_kalma_suresi'));
    const fireZayiatYuzde = parseDecimal(formData.get('fire_zayiat_orani_yuzde'));
    const standartInisMaliyeti = parseDecimal(formData.get('standart_inis_maliyeti_net'));
    const sonGercekInisMaliyeti = parseDecimal(formData.get('son_gercek_inis_maliyeti_net'));
    const satisFiyatiToptanci = parseDecimal(formData.get('satis_fiyati_toptanci'));

    const data: TablesUpdate<'urunler'> = {
        ad: adJson,
        aciklamalar: aciklamalarJson,
        kategori_id: formData.get('kategori_id') as string,
        tedarikci_id: (formData.get('tedarikci_id') as string) || null,
        stok_kodu: formData.get('stok_kodu') as string || null,
        ean_gtin:  (formData.get('ean_gtin') as string || '').trim() || null,
        slug: formData.get('slug') as string,
        stok_miktari: parseInt(formData.get('stok_miktari') as string || '0', 10),
        stok_esigi: parseInt(formData.get('stok_esigi') as string || '0', 10),
        ana_satis_birimi_id: (formData.get('ana_satis_birimi_id') as string) || null,
        distributor_alis_fiyati: parseFloat(formData.get('distributor_alis_fiyati') as string || '0'),
        satis_fiyati_musteri: parseFloat(formData.get('satis_fiyati_musteri') as string || '0'),
        satis_fiyati_alt_bayi: parseFloat(formData.get('satis_fiyati_alt_bayi') as string || '0'),
        satis_fiyati_toptanci: satisFiyatiToptanci,
        aktif: formData.get('aktif') === 'on',
        ana_resim_url: (formData.get('ana_resim_url') as string) || null,
        galeri_resim_urls: galeriUrls,
        urun_gami: urunGami,
        kutu_ici_adet: kutuIciAdet,
        koli_ici_kutu_adet: koliIciKutuAdet,
        palet_ici_koli_adet: paletIciKoliAdet,
        alis_fiyat_seviyesi: alisFiyatSeviyesi,
        birim_agirlik_kg: birimAgirlikKg,
        lojistik_sinifi: lojistikSinifi,
        gumruk_vergi_orani_yuzde: gumrukVergiYuzde,
        almanya_kdv_orani: almanyaKdvOrani,
        gunluk_depolama_maliyeti_eur: gunlukDepolamaMaliyeti,
        ortalama_stokta_kalma_suresi: ortalamaStokGun,
        fire_zayiat_orani_yuzde: fireZayiatYuzde,
        standart_inis_maliyeti_net: standartInisMaliyeti,
        son_gercek_inis_maliyeti_net: sonGercekInisMaliyeti,
        karlilik_alarm_aktif: formData.get('karlilik_alarm_aktif') === 'on',
    };
    
    const teknikOzelliklerObj: { [key: string]: any } = {};
    
    // Dynamische teknik_ Felder sammeln (aus Template)
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('teknik_')) {
            const asilKey = key.replace('teknik_', '');
            const numValue = Number(value);
            teknikOzelliklerObj[asilKey] = isNaN(numValue) || value === '' ? value : numValue;
        }
    }
    
    // Filter-Eigenschaften hinzufügen (Checkboxen)
    teknikOzelliklerObj.vegan = formData.get('eigenschaft_vegan') === 'on';
    teknikOzelliklerObj.vegetarisch = formData.get('eigenschaft_vegetarisch') === 'on';
    teknikOzelliklerObj.glutenfrei = formData.get('eigenschaft_glutenfrei') === 'on';
    teknikOzelliklerObj.laktosefrei = formData.get('eigenschaft_laktosefrei') === 'on';
    teknikOzelliklerObj.bio = formData.get('eigenschaft_bio') === 'on';
    teknikOzelliklerObj.ohne_zucker = formData.get('eigenschaft_ohne_zucker') === 'on';
    teknikOzelliklerObj.dogal_icerik = formData.get('eigenschaft_dogal_icerik') === 'on';
    teknikOzelliklerObj.katkisiz = formData.get('eigenschaft_katkisiz') === 'on';
    teknikOzelliklerObj.koruyucusuz = formData.get('eigenschaft_koruyucusuz') === 'on';
    teknikOzelliklerObj.pompa_uyumlu = formData.get('eigenschaft_pompa_uyumlu') === 'on';
    
    if (kutuIciAdet !== null) teknikOzelliklerObj.kutu_ici_adet = kutuIciAdet;
    if (koliIciKutuAdet !== null) teknikOzelliklerObj.koli_ici_kutu_adet = koliIciKutuAdet;
    if (paletIciKoliAdet !== null) teknikOzelliklerObj.palet_ici_koli_adet = paletIciKoliAdet;
    if (kutuIciAdet !== null && koliIciKutuAdet !== null) teknikOzelliklerObj.koli_ici_adet = kutuIciAdet * koliIciKutuAdet;
    if (koliIciKutuAdet !== null && paletIciKoliAdet !== null) teknikOzelliklerObj.palet_ici_kutu_adet = koliIciKutuAdet * paletIciKoliAdet;
    if (kutuIciAdet !== null && koliIciKutuAdet !== null && paletIciKoliAdet !== null) {
        teknikOzelliklerObj.palet_ici_adet = kutuIciAdet * koliIciKutuAdet * paletIciKoliAdet;
    }
    teknikOzelliklerObj.alis_fiyat_seviyesi = alisFiyatSeviyesi;
    if (birimAgirlikKg !== null) teknikOzelliklerObj.birim_agirlik_kg = birimAgirlikKg;
    if (lojistikSinifi) teknikOzelliklerObj.lojistik_sinifi = lojistikSinifi;
    if (gumrukVergiYuzde !== null) teknikOzelliklerObj.gumruk_vergi_orani_yuzde = gumrukVergiYuzde;
    if (almanyaKdvOrani !== null) teknikOzelliklerObj.almanya_kdv_orani = almanyaKdvOrani;
    if (gunlukDepolamaMaliyeti !== null) teknikOzelliklerObj.gunluk_depolama_maliyeti_eur = gunlukDepolamaMaliyeti;
    if (ortalamaStokGun !== null) teknikOzelliklerObj.ortalama_stokta_kalma_suresi = ortalamaStokGun;
    if (fireZayiatYuzde !== null) teknikOzelliklerObj.fire_zayiat_orani_yuzde = fireZayiatYuzde;
    if (standartInisMaliyeti !== null) teknikOzelliklerObj.standart_inis_maliyeti_net = standartInisMaliyeti;
    if (sonGercekInisMaliyeti !== null) teknikOzelliklerObj.son_gercek_inis_maliyeti_net = sonGercekInisMaliyeti;

    // Geschmack hinzufügen (Multiple Checkboxes + Custom)
    const geschmackArray: string[] = [];
    
    // Collect all checked standard flavors
    for (let i = 0; i < 20; i++) { // Max 20 flavors
        const flavorValue = formData.get(`geschmack_${i}`) as string;
        if (flavorValue) {
            // Normalize Turkish alias 'visne' to canonical 'kirsche'
            const normalized = flavorValue.toLowerCase() === 'visne' ? 'kirsche' : flavorValue;
            geschmackArray.push(normalized);
        }
    }
    
    // Add custom flavors if provided
    const customGeschmack = formData.get('geschmack_custom') as string;
    if (customGeschmack && customGeschmack.trim()) {
        // Split by comma and add each custom flavor
        const customFlavors = customGeschmack
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0)
            .map(f => (f.toLowerCase() === 'visne' ? 'kirsche' : f));
        geschmackArray.push(...customFlavors);
    }
    
    // Save as array if multiple flavors, otherwise as string for backward compatibility
    if (geschmackArray.length > 0) {
        teknikOzelliklerObj.geschmack = geschmackArray;
    }
    
    data.teknik_ozellikler = teknikOzelliklerObj;
    return data;
}

function stripUnsupportedUrunColumns<T extends TablesUpdate<'urunler'>>(data: T): TablesUpdate<'urunler'> {
    const {
        urun_gami,
        kutu_ici_adet,
        koli_ici_kutu_adet,
        palet_ici_koli_adet,
        alis_fiyat_seviyesi,
        birim_agirlik_kg,
        lojistik_sinifi,
        gumruk_vergi_orani_yuzde,
        almanya_kdv_orani,
        gunluk_depolama_maliyeti_eur,
        ortalama_stokta_kalma_suresi,
        fire_zayiat_orani_yuzde,
        standart_inis_maliyeti_net,
        son_gercek_inis_maliyeti_net,
        karlilik_alarm_aktif,
        satis_fiyati_toptanci,
        ...fallbackData
    } = data;

    return fallbackData;
}

// Typ für Rückgabewert
export type FormState = { success: boolean; message: string; } | null;

type UploadImageResult = {
    success: boolean;
    message?: string;
    url?: string;
    path?: string;
};

async function ensureUrunImageAccess() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Nicht authentifiziert.' };
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Personel' && profile?.rol !== 'Ekip Üyesi') {
        return { error: 'Bu islem icin yetki gerekiyor.' };
    }

    return { userId: user.id };
}

export async function uploadUrunImageAction(formData: FormData): Promise<UploadImageResult> {
    const access = await ensureUrunImageAccess();
    if ('error' in access) {
        return { success: false, message: access.error };
    }

    const file = formData.get('file');
    const folder = slugify(String(formData.get('folder') || 'products')) || 'products';
    const upsert = String(formData.get('upsert') || '') === 'true';

    if (!(file instanceof File)) {
        return { success: false, message: 'Gecerli bir resim secin.' };
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type)) {
        return { success: false, message: 'Sadece PNG, JPG ve WEBP desteklenir.' };
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        return { success: false, message: 'Resim boyutu 10MB altinda olmali.' };
    }

    const safeFileName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'urun-resmi';
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'webp' : 'webp';
    const filePath = `${folder}/${Date.now()}-${safeFileName}.${extension}`;

    const serviceSupabase = createSupabaseServiceClient();
    const { data, error } = await serviceSupabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(filePath, file, {
            contentType: file.type,
            upsert,
        });

    if (error || !data) {
        return { success: false, message: error?.message || 'Resim yuklenemedi.' };
    }

    const { data: publicUrlData } = serviceSupabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(data.path);

    return {
        success: true,
        url: publicUrlData.publicUrl,
        path: data.path,
    };
}

export async function removeUrunImagesAction(paths: string[]): Promise<{ success: boolean; message?: string }> {
    const access = await ensureUrunImageAccess();
    if ('error' in access) {
        return { success: false, message: access.error };
    }

    if (!paths.length) {
        return { success: true };
    }

    const serviceSupabase = createSupabaseServiceClient();
    const { error } = await serviceSupabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(paths);

    if (error) {
        return { success: false, message: error.message };
    }

    return { success: true };
}

// --- Aktionen ---

export async function updateUrunAction(urunId: string, formData: FormData): Promise<FormState> {
    console.log('--- updateUrunAction gestartet ---');
    console.log('urunId:', urunId);

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return { success: false, message: "Nicht authentifiziert." };

    const guncellenecekVeri = formDataToUrunObject(formData);
    // Kategorie-Änderung erlauben: Wenn kategori_id im Formular vorhanden ist, aktualisieren wir sie ebenfalls.
    // (Falls Backend-Policy dies beschränken soll, bitte RLS/Policies entsprechend anpassen.)

    console.log('Zu aktualisierende Daten (vor Slug-Prüfung):', JSON.stringify(guncellenecekVeri, null, 2));

    if (!guncellenecekVeri.slug) {
        console.error('Fehler: Slug ist leer.');
        return { success: false, message: 'URL (Slug) darf nicht leer sein.' };
    }
    
    const finalSlug = await findUniqueSlug(supabase, guncellenecekVeri.slug, urunId);
    if (finalSlug !== guncellenecekVeri.slug) {
         console.log(`Slug geändert von "${guncellenecekVeri.slug}" zu "${finalSlug}"`);
         guncellenecekVeri.slug = finalSlug;
    }

    console.log('Finale zu aktualisierende Daten:', JSON.stringify(guncellenecekVeri, null, 2));

    let { data: updatedData, error } = await supabase
        .from('urunler')
        .update(guncellenecekVeri)
        .eq('id', urunId)
        .select('id');

    if (error && (
        error.code === 'PGRST204'
        || error.code === '42703'
        || error.message?.includes('urun_gami')
        || error.message?.includes('kutu_ici_adet')
        || error.message?.includes('koli_ici_kutu_adet')
        || error.message?.includes('palet_ici_koli_adet')
        || error.message?.includes('alis_fiyat_seviyesi')
    )) {
        ({ data: updatedData, error } = await supabase
            .from('urunler')
            .update(stripUnsupportedUrunColumns(guncellenecekVeri))
            .eq('id', urunId)
            .select('id'));
    }

    if (error) {
        console.error("Fehler beim Aktualisieren des Produkts:", error);
        return { success: false, message: 'Produkt konnte nicht aktualisiert werden: ' + error.message };
    }

    if (!updatedData || updatedData.length === 0) {
         console.warn("Update-Befehl erfolgreich, aber keine Zeilen betroffen.");
    } else {
         console.log("Update erfolgreich, betroffene Zeilen:", updatedData.length);
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath(`/admin/urun-yonetimi/urunler/${urunId}`);
    revalidatePath('/[locale]/products', 'layout');

    return { success: true, message: 'Produkt erfolgreich aktualisiert!' };
}

export async function createUrunAction(formData: FormData): Promise<FormState> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    const yeniVeri = formDataToUrunObject(formData);
    if (!yeniVeri.kategori_id) { return { success: false, message: 'Kategorie wählen.' }; }
    if (!yeniVeri.ana_satis_birimi_id) { return { success: false, message: 'Verkaufseinheit wählen.' }; }
    if (!yeniVeri.slug) { return { success: false, message: 'Slug ist Pflichtfeld.' }; }
    yeniVeri.slug = await findUniqueSlug(supabase, yeniVeri.slug);
    
    let { data, error } = await supabase
        .from('urunler')
        .insert(yeniVeri as TablesInsert<'urunler'>) // Cast, da 'kategori_id' jetzt vorhanden ist
        .select('id')
        .single();

    if (error && (
        error.code === 'PGRST204'
        || error.code === '42703'
        || error.message?.includes('urun_gami')
        || error.message?.includes('kutu_ici_adet')
        || error.message?.includes('koli_ici_kutu_adet')
        || error.message?.includes('palet_ici_koli_adet')
        || error.message?.includes('alis_fiyat_seviyesi')
        || error.message?.includes('birim_agirlik_kg')
        || error.message?.includes('lojistik_sinifi')
        || error.message?.includes('gumruk_vergi_orani_yuzde')
        || error.message?.includes('standart_inis_maliyeti_net')
        || error.message?.includes('satis_fiyati_toptanci')
    )) {
        ({ data, error } = await supabase
            .from('urunler')
            .insert(stripUnsupportedUrunColumns(yeniVeri) as TablesInsert<'urunler'>)
            .select('id')
            .single());
    }
        
    if (error || !data) { 
        console.error("Fehler Create:", error); 
        return { success: false, message: 'Erstellen fehlgeschlagen: ' + error.message }; 
    }
    
    revalidatePath('/admin/urun-yonetimi/urunler'); 
    revalidatePath('/[locale]/products', 'layout');
    
    return { success: true, message: 'Produkt erstellt!' };
}

export async function deleteUrunAction(
    urunId: string,
    force = false,
    locale = 'de',
): Promise<{ success: boolean; message: string; orderCount?: number }> {

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Sipariş kaydı var mı kontrol et
    const { count: orderCount, error: countError } = await supabase
        .from('siparis_detay')
        .select('id', { count: 'exact', head: true })
        .eq('urun_id', urunId);

    if (countError) {
        console.error("Fehler bei der Prüfung von Bestellungen:", countError);
        return { success: false, message: 'Fehler bei der Prüfung von Bestellungen: ' + countError.message };
    }

    const hasOrders = orderCount !== null && orderCount > 0;

    // force=false ise kullanıcıya bildir, onay bekle
    if (hasOrders && !force) {
        return {
            success: false,
            orderCount: orderCount ?? 0,
            message: `FORCE_CONFIRM:${orderCount}`,
        };
    }

    // Sipariş satırları varsa, geçmiş verileri korumak için placeholder ürüne yönlendir
    if (hasOrders && force) {
        // Placeholder ürünü bul veya oluştur
        let { data: placeholder } = await supabase
            .from('urunler')
            .select('id')
            .eq('stok_kodu', '__DELETED__')
            .maybeSingle();

        if (!placeholder) {
            const { data: newPlaceholder, error: createErr } = await supabase
                .from('urunler')
                .insert({
                    stok_kodu: '__DELETED__',
                    ad: { tr: 'Silinmiş Ürün', de: 'Gelöschtes Produkt', en: 'Deleted Product', ar: 'منتج محذوف' },
                    slug: '__deleted-placeholder__',
                    aktif: false,
                    distributor_alis_fiyati: 0,
                })
                .select('id')
                .single();
            if (createErr || !newPlaceholder) {
                console.error('Placeholder ürün oluşturulamadı:', createErr);
                return { success: false, message: 'Placeholder ürün oluşturulamadı: ' + createErr?.message };
            }
            placeholder = newPlaceholder;
        }

        // Sipariş satırlarını placeholder'a yönlendir
        const { error: redirectErr } = await supabase
            .from('siparis_detay')
            .update({ urun_id: placeholder.id })
            .eq('urun_id', urunId);

        if (redirectErr) {
            console.error('siparis_detay yönlendirme hatası:', redirectErr);
            return { success: false, message: 'Sipariş satırları taşınamadı: ' + redirectErr.message };
        }
    }

    // Değerlendirmeleri ve favorileri sil (bunlar silinebilir)
    await supabase.from('urun_degerlendirmeleri').delete().eq('urun_id', urunId);
    await supabase.from('favori_urunler').delete().eq('urun_id', urunId);

    // Ürünü sil
    const { error } = await supabase.from('urunler').delete().eq('id', urunId);

    if (error) {
        console.error("Fehler beim Löschen des Produkts:", error);
        return { success: false, message: 'Produkt konnte nicht gelöscht werden: ' + error.message };
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath('/[locale]/products', 'layout');

    redirect(`/${locale}/admin/urun-yonetimi/urunler`);
}

// Hafif güncelleme action'ı - sadece belirli alanları günceller
export async function quickUpdateUrunAction(
    urunId: string, 
    updates: {
        distributor_alis_fiyati?: number;
        stok_miktari?: number;
        aktif?: boolean;
    }
): Promise<FormState> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Kullanıcı kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Nicht authentifiziert." };

    // Sadece gönderilen alanları güncelle
    const updateData: any = {};
    if (updates.distributor_alis_fiyati !== undefined) {
        updateData.distributor_alis_fiyati = updates.distributor_alis_fiyati;
    }
    if (updates.stok_miktari !== undefined) {
        updateData.stok_miktari = updates.stok_miktari;
    }
    if (updates.aktif !== undefined) {
        updateData.aktif = updates.aktif;
    }

    const { data, error } = await supabase
        .from('urunler')
        .update(updateData)
        .eq('id', urunId)
        .select('id');

    if (error) {
        console.error("Fehler beim Aktualisieren:", error);
        return { success: false, message: 'Aktualisierung fehlgeschlagen: ' + error.message };
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    return { success: true, message: 'Erfolgreich aktualisiert!' };
}