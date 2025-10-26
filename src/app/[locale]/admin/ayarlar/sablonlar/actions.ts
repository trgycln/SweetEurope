// src/app/[locale]/admin/ayarlar/sablonlar/actions.ts
// KORRIGIERTE VERSION (await cookies + await createClient)

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types'; // Insert/Update hinzugefügt
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { redirect } from 'next/navigation'; // Importieren, falls benötigt

const diller = ['de', 'en', 'tr', 'ar'];
const revalidatePage = () => revalidatePath('/admin/ayarlar/sablonlar');

// Typ für Rückgabewerte
type ActionResult = {
    success: boolean;
    message: string;
    error?: string; // Optional: spezifischere Fehlermeldung
};

// Typdefinitionen (angepasst von Ihrem Code)
// 'id' und 'created_at' werden von DB generiert
type SablonInsert = Omit<Tables<'kategori_ozellik_sablonlari'>, 'id' | 'created_at'>;
// Alle Felder sind optional für Update
type SablonUpdate = Partial<SablonInsert>;


// YENİ ÖZELLİK OLUŞTURAN ACTION (KORRIGIERT)
export async function createSablonAction(formData: FormData): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return { success: false, message: "Nicht authentifiziert.", error: "Nicht authentifiziert." };
    // ... Rollenprüfung ...

    // GÖSTERİM ADI JSON OLUŞTURMA
    const gosterimAdiJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        gosterimAdiJson[dil] = formData.get(`gosterim_adi_${dil}`) as string || '';
    });

    // Daten aus FormData extrahieren
    const veri: SablonInsert = {
        kategori_id: formData.get('kategori_id') as string,
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: gosterimAdiJson,
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
    };

    // Validierung
    if (!veri.kategori_id || !veri.alan_adi || !gosterimAdiJson.tr) { // Annahme 'tr' ist Pflicht
        return { success: false, message: 'Kategorie, Feldname und Türkischer Anzeigename sind Pflichtfelder.' };
    }

    // Insert
    const { error } = await supabase.from('kategori_ozellik_sablonlari').insert(veri as TablesInsert<'kategori_ozellik_sablonlari'>);

    if (error) {
        console.error("Fehler beim Erstellen der Vorlage:", error);
        return { success: false, message: 'Fehler beim Erstellen der Eigenschaft: ' + error.message, error: error.message };
    }

    revalidatePage();
    return { success: true, message: 'Neue Eigenschaft erfolgreich hinzugefügt.' };
}

// MEVCUT ÖZELLİĞİ GÜNCELLEYEN ACTION (KORRIGIERT)
export async function updateSablonAction(sablonId: string, formData: FormData): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---
    
    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return { success: false, message: "Nicht authentifiziert.", error: "Nicht authentifiziert." };
    // ... Rollenprüfung ...

    // GÖSTERİM ADI JSON OLUŞTURMA
    const gosterimAdiJson: { [key: string]: string } = {};
    diller.forEach(dil => {
        gosterimAdiJson[dil] = formData.get(`gosterim_adi_${dil}`) as string || '';
    });

    // Update-Daten
    const veri: SablonUpdate = {
        alan_adi: formData.get('alan_adi') as string,
        gosterim_adi: gosterimAdiJson,
        alan_tipi: formData.get('alan_tipi') as string,
        sira: parseInt(formData.get('sira') as string || '0', 10),
        public_gorunur: formData.get('public_gorunur') === 'on',
        musteri_gorunur: formData.get('musteri_gorunur') === 'on',
        alt_bayi_gorunur: formData.get('alt_bayi_gorunur') === 'on'
        // kategori_id wird nicht aktualisiert
    };
    
    // Update
    const { error } = await supabase.from('kategori_ozellik_sablonlari').update(veri).eq('id', sablonId);

    if (error) {
        console.error("Fehler beim Aktualisieren der Vorlage:", error);
        return { success: false, message: 'Fehler beim Aktualisieren der Eigenschaft: ' + error.message, error: error.message };
    }
    
    revalidatePage();
    return { success: true, message: 'Eigenschaft erfolgreich aktualisiert.' };
}

// ÖZELLİĞİ SİLEN ACTION (KORRIGIERT)
export async function deleteSablonAction(sablonId: string): Promise<ActionResult> {
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return { success: false, message: "Nicht authentifiziert.", error: "Nicht authentifiziert." };
    // ... Rollenprüfung ...

    const { error } = await supabase.from('kategori_ozellik_sablonlari').delete().eq('id', sablonId);
    
    if (error) {
        console.error("Fehler beim Löschen der Vorlage:", error);
        if (error.code === '23503') { // Foreign key violation
            return { success: false, message: 'Diese Eigenschaft wird in Produkten verwendet und kann nicht gelöscht werden.', error: 'Diese Eigenschaft wird in Produkten verwendet und kann nicht gelöscht werden.' };
        }
        return { success: false, message: 'Fehler beim Löschen der Eigenschaft: ' + error.message, error: error.message };
    }
    
    revalidatePage();
    return { success: true, message: 'Eigenschaft erfolgreich gelöscht.' };
}