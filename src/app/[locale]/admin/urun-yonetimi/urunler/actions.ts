// src/app/[locale]/admin/urun-yonetimi/urunler/actions.ts (Mit Debugging-Logs)
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { slugify } from '@/lib/utils'; // slugify importieren (falls noch nicht geschehen)

const diller = ['de', 'en', 'tr', 'ar'];

// --- Hilfsfunktionen (unverändert) ---
async function findUniqueSlug(supabase: SupabaseClient, baseSlug: string, excludeId?: string ): Promise<string> {
    let currentSlug = slugify(baseSlug); // Sicherstellen, dass der Basis-Slug bereinigt ist
    if (!currentSlug) currentSlug = 'produkt';
    let originalSlug = currentSlug; // Originalen Slug speichern für den Zähler
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
function formDataToUrunObject(formData: FormData): TablesUpdate {
    const adJson: { [key: string]: string } = {};
    const aciklamalarJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        adJson[dil] = formData.get(`ad_${dil}`) as string || '';
        aciklamalarJson[dil] = formData.get(`aciklamalar_${dil}`) as string || '';
    });
    const galeriUrls = formData.has('galeri_resim_urls[]') ? formData.getAll('galeri_resim_urls[]') as string[] : [];

    const data: TablesUpdate = {
        ad: adJson,
        aciklamalar: aciklamalarJson,
        kategori_id: formData.get('kategori_id') as string, // Wird später für Update entfernt
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
        // @ts-ignore
        galeri_resim_urls: galeriUrls,
    };
    const teknikOzelliklerObj: { [key: string]: any } = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('teknik_')) {
            const asilKey = key.replace('teknik_', '');
            const numValue = Number(value);
            teknikOzelliklerObj[asilKey] = isNaN(numValue) || value === '' ? value : numValue; // Leere Strings nicht als 0 speichern
        }
    }
     if (Object.keys(teknikOzelliklerObj).length > 0) {
        data.teknik_ozellikler = teknikOzelliklerObj;
    } else {
         // Wenn keine technischen Daten gesendet wurden, das Feld NICHT überschreiben
         // delete data.teknik_ozellikler; // Entfernen, um es nicht zu nullen
         // ODER explizit auf '{}' setzen, falls null nicht erlaubt ist
         data.teknik_ozellikler = {};
    }
    return data;
}

// Typ für Rückgabewert
export type FormState = { success: boolean; message: string; } | null;

// --- Aktionen ---

export async function updateUrunAction(urunId: string, formData: FormData): Promise<FormState> {
  console.log('--- updateUrunAction gestartet ---');
  console.log('urunId:', urunId);
  // Logge einige Werte aus FormData zur Überprüfung
  console.log('FormData (Beispiele):', {
      baslik_de: formData.get('ad_de'),
      stok: formData.get('stok_miktari'),
      aktif: formData.get('aktif'),
      slug: formData.get('slug')
  });

  const supabase = createSupabaseServerClient();
  const guncellenecekVeri = formDataToUrunObject(formData);
  // Kategorie kann im Nachhinein nicht geändert werden
  delete guncellenecekVeri.kategori_id;

  console.log('Zu aktualisierende Daten (vor Slug-Prüfung):', JSON.stringify(guncellenecekVeri, null, 2));


  if (!guncellenecekVeri.slug) {
       console.error('Fehler: Slug ist leer.');
       return { success: false, message: 'URL (Slug) darf nicht leer sein.' };
   }
  // Stelle sicher, dass der Slug einzigartig ist (außer für das aktuelle Produkt)
  const finalSlug = await findUniqueSlug(supabase, guncellenecekVeri.slug, urunId);
  if (finalSlug !== guncellenecekVeri.slug) {
      console.log(`Slug geändert von "${guncellenecekVeri.slug}" zu "${finalSlug}"`);
      guncellenecekVeri.slug = finalSlug;
  }

  console.log('Finale zu aktualisierende Daten:', JSON.stringify(guncellenecekVeri, null, 2));

  // Führe das Update durch und frage die ID zurück (select('id'))
  const { data: updatedData, error } = await supabase
    .from('urunler')
    .update(guncellenecekVeri)
    .eq('id', urunId)
    .select('id'); // Wichtig: Fordere Daten an, um zu sehen, ob Zeilen betroffen waren

  if (error) {
    console.error("Fehler beim Aktualisieren des Produkts:", error);
    return { success: false, message: 'Produkt konnte nicht aktualisiert werden: ' + error.message };
  }

  // PRÜFE, ob tatsächlich etwas aktualisiert wurde
  if (!updatedData || updatedData.length === 0) {
      console.warn("Update-Befehl erfolgreich, aber keine Zeilen betroffen. Mögliche Ursachen: RLS, ID nicht gefunden, oder keine Änderungen gesendet.");
      // Optional: Hier eine spezifischere Fehlermeldung zurückgeben?
      // return { success: false, message: 'Update war technisch erfolgreich, aber es wurden keine Daten geändert.' };
      // Vorerst belassen wir es bei der Erfolgsmeldung, aber das Log ist wichtig.
  } else {
       console.log("Update erfolgreich, betroffene Zeilen:", updatedData.length);
  }


  // Pfade aktualisieren
  revalidatePath('/admin/urun-yonetimi/urunler');
  revalidatePath(`/admin/urun-yonetimi/urunler/${urunId}`);
  revalidatePath('/[locale]/products', 'layout');

  return { success: true, message: 'Produkt erfolgreich aktualisiert!' };
}

// createUrunAction (unverändert, außer prevState entfernt)
export async function createUrunAction(formData: FormData): Promise<FormState> { /* ... (Code wie oben) ... */
    const supabase = createSupabaseServerClient();
    const yeniVeri = formDataToUrunObject(formData);
    if (!yeniVeri.kategori_id) { return { success: false, message: 'Kategorie wählen.' }; }
    if (!yeniVeri.ana_satis_birimi_id) { return { success: false, message: 'Verkaufseinheit wählen.' }; }
    if (!yeniVeri.slug) { return { success: false, message: 'Slug ist Pflichtfeld.' }; }
    yeniVeri.slug = await findUniqueSlug(supabase, yeniVeri.slug);
    const { data, error } = await supabase.from('urunler').insert(yeniVeri as TablesInsert<'urunler'>).select('id').single();
    if (error || !data) { console.error("Fehler Create:", error); return { success: false, message: 'Erstellen fehlgeschlagen: ' + error.message }; }
    revalidatePath('/admin/urun-yonetimi/urunler'); revalidatePath('/[locale]/products', 'layout');
    return { success: true, message: 'Produkt erstellt!' };
}

// deleteUrunAction (unverändert)
export async function deleteUrunAction(urunId: string): Promise<{ success: boolean; message: string }> {
    const supabase = createSupabaseServerClient();

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
        return { success: false, message: 'Dieses Produkt ist mit einer oder mehreren Bestellungen verknüpft und kann nicht gelöscht werden.' };
    }

    // Wenn keine Bestellungen verknüpft sind, löschen
    const { error } = await supabase.from('urunler').delete().eq('id', urunId);

    if (error) {
        console.error("Fehler beim Löschen des Produkts:", error);
        return { success: false, message: 'Produkt konnte nicht gelöscht werden: ' + error.message };
    }

    // Pfade aktualisieren (wird vor dem Redirect ausgeführt)
    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath('/[locale]/products', 'layout');

    // KORREKTUR: KEINE Rückgabe hier, stattdessen Weiterleitung
    // return { success: true, message: 'Produkt erfolgreich gelöscht!' };

    // WICHTIG: Nach erfolgreichem Löschen und Revalidieren zur Liste weiterleiten.
    // Die Locale muss hier bekannt sein. Da Actions keinen direkten Zugriff auf params haben,
    // müssen wir sie entweder übergeben oder einen generischen Pfad verwenden und uns
    // auf die Middleware verlassen, um die Locale hinzuzufügen.
    redirect('/admin/urun-yonetimi/urunler'); // Middleware fügt /de/ etc. hinzu
}