// src/app/[locale]/admin/urun-yonetimi/urunler/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient in allen Funktionen)
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/supabase/database.types'; // Database importieren
import { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { slugify } from '@/lib/utils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren

const diller = ['de', 'en', 'tr', 'ar'];

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
    const adJson: { [key: string]: string } = {};
    const aciklamalarJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
        aciklamalarJson[dil] = formData.get(`aciklamalar_${dil}`) as string || '';
    });
    const galeriUrls = formData.has('galeri_resim_urls[]') ? formData.getAll('galeri_resim_urls[]') as string[] : [];

    const data: TablesUpdate<'urunler'> = {
        ad: adJson,
        aciklamalar: aciklamalarJson,
        kategori_id: formData.get('kategori_id') as string,
        tedarikci_id: (formData.get('tedarikci_id') as string) || null,
        stok_kodu: formData.get('stok_kodu') as string || null,
        slug: formData.get('slug') as string,
        stok_miktari: parseInt(formData.get('stok_miktari') as string || '0', 10),
        stok_esigi: parseInt(formData.get('stok_esigi') as string || '0', 10),
        ana_satis_birimi_id: (formData.get('ana_satis_birimi_id') as string) || null,
        distributor_alis_fiyati: parseFloat(formData.get('distributor_alis_fiyati') as string || '0'),
        satis_fiyati_musteri: parseFloat(formData.get('satis_fiyati_musteri') as string || '0'),
        satis_fiyati_alt_bayi: parseFloat(formData.get('satis_fiyati_alt_bayi') as string || '0'),
        aktif: formData.get('aktif') === 'on',
        ana_resim_url: (formData.get('ana_resim_url') as string) || null,
        galeri_resim_urls: galeriUrls,
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
    
    // Geschmack hinzufügen (Multiple Checkboxes + Custom)
    const geschmackArray: string[] = [];
    
    // Collect all checked standard flavors
    for (let i = 0; i < 20; i++) { // Max 20 flavors
        const flavorValue = formData.get(`geschmack_${i}`) as string;
        if (flavorValue) {
            geschmackArray.push(flavorValue);
        }
    }
    
    // Add custom flavors if provided
    const customGeschmack = formData.get('geschmack_custom') as string;
    if (customGeschmack && customGeschmack.trim()) {
        // Split by comma and add each custom flavor
        const customFlavors = customGeschmack.split(',').map(f => f.trim()).filter(f => f.length > 0);
        geschmackArray.push(...customFlavors);
    }
    
    // Save as array if multiple flavors, otherwise as string for backward compatibility
    if (geschmackArray.length > 0) {
        teknikOzelliklerObj.geschmack = geschmackArray;
    }
    
    data.teknik_ozellikler = teknikOzelliklerObj;
    return data;
}

// Typ für Rückgabewert
export type FormState = { success: boolean; message: string; } | null;

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

    const { data: updatedData, error } = await supabase
        .from('urunler')
        .update(guncellenecekVeri)
        .eq('id', urunId)
        .select('id');

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
    
    const { data, error } = await supabase
        .from('urunler')
        .insert(yeniVeri as TablesInsert<'urunler'>) // Cast, da 'kategori_id' jetzt vorhanden ist
        .select('id')
        .single();
        
    if (error || !data) { 
        console.error("Fehler Create:", error); 
        return { success: false, message: 'Erstellen fehlgeschlagen: ' + error.message }; 
    }
    
    revalidatePath('/admin/urun-yonetimi/urunler'); 
    revalidatePath('/[locale]/products', 'layout');
    
    return { success: true, message: 'Produkt erstellt!' };
}

export async function deleteUrunAction(urunId: string): Promise<{ success: boolean; message: string }> {

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Zuerst prüfen, ob das Produkt in siparis_detay verwendet wird
    const { count: orderCount, error: countError } = await supabase
        .from('siparis_detay')
        .select('id', { count: 'exact', head: true })
        .eq('urun_id', urunId);

    if (countError) {
        console.error("Fehler bei der Prüfung von Bestellungen:", countError);
        return { success: false, message: 'Fehler bei der Prüfung von Bestellungen: ' + countError.message };
    }

    if (orderCount !== null && orderCount > 0) {
        return { 
            success: false, 
            message: `Dieses Produkt ist mit ${orderCount} Bestellung(en) verknüpft und kann nicht gelöscht werden. Sie können es stattdessen deaktivieren, um es aus dem Shop zu entfernen.` 
        };
    }

    // Wenn keine Bestellungen verknüpft sind, löschen
    const { error } = await supabase.from('urunler').delete().eq('id', urunId);

    if (error) {
        console.error("Fehler beim Löschen des Produkts:", error);
        return { success: false, message: 'Produkt konnte nicht gelöscht werden: ' + error.message };
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath('/[locale]/products', 'layout');

    // WICHTIG: Nach erfolgreichem Löschen weiterleiten
    // Da dies eine Action ist, die von einem Formular (Button) aufgerufen wird,
    // sollte die Weiterleitung im Client-Code (DeleteButtonWrapper) erfolgen,
    // nachdem 'success: true' zurückgegeben wurde.
    // Der Redirect hier würde den Toast im Client verhindern.
    // redirect('/admin/urun-yonetimi/urunler'); // Nicht hier, sondern im Client
    return { success: true, message: 'Produkt erfolgreich gelöscht!' };
}