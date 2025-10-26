// src/app/[locale]/admin/gorevler/ekle/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient in Page und Action)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types'; // Enums hinzugefügt
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Typen
type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type GorevOncelik = Enums<'gorev_oncelik'>; // Korrekter Typ für Priorität

// Server Action zum Erstellen der Aufgabe
async function gorevEkleAction(locale: Locale, formData: FormData) { // Locale übergeben
  'use server';

  // --- KORREKTUR 1: Supabase Client in Server Action ---
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // --- ENDE KORREKTUR ---

  const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
  if (!user) {
    // Leite zur sprachspezifischen Login-Seite weiter
    return redirect(`/${locale}/login?next=/admin/gorevler/ekle`);
  }

  // Formulardaten abrufen
  const baslik = formData.get('baslik') as string | null;
  const aciklama = formData.get('aciklama') as string | null;
  const son_tarih_raw = formData.get('son_tarih') as string | null;
  const atanan_kisi_id = formData.get('atanan_kisi_id') as string | null;
  const ilgili_firma_id = formData.get('ilgili_firma_id') as string | null;
  const oncelik = formData.get('oncelik') as GorevOncelik;

  // Validierung
  if (!baslik || !atanan_kisi_id) {
    console.error("Başlık und Atanan Kişi sind Pflichtfelder.");
    // TODO: Bessere Fehlermeldung an den Client zurückgeben (z.B. mit useFormState)
    return;
  }

  // Daten für Insert vorbereiten
  const insertData: Partial<Tables<'gorevler'>> = {
      baslik: baslik,
      aciklama: aciklama || null,
      son_tarih: (son_tarih_raw && son_tarih_raw.trim() !== '') ? new Date(son_tarih_raw).toISOString() : null,
      atanan_kisi_id: atanan_kisi_id,
      ilgili_firma_id: (ilgili_firma_id && ilgili_firma_id.trim() !== '') ? ilgili_firma_id : null, // Leeren String als NULL speichern
      olusturan_kisi_id: user.id, // Ersteller setzen
      oncelik: oncelik,
      tamamlandi: false,
      durum: 'Yapılacak', // Standard-Status setzen (falls Spalte 'durum' verwendet wird)
  };

  const { error } = await supabase.from('gorevler').insert(insertData);

  if (error) {
    console.error('Fehler beim Hinzufügen der Aufgabe:', error.message);
    // TODO: Bessere Fehlermeldung an den Client zurückgeben
  } else {
    // Cache revalidieren und zur (sprachspezifischen) Liste zurückleiten
    revalidatePath(`/${locale}/admin/gorevler`);
    redirect(`/${locale}/admin/gorevler`);
  }
}

// Props-Typ für die Seite
interface GorevEklemeSayfasiProps {
    params: { locale: Locale };
    // searchParams könnten hier auch hinzugefügt werden
}

// Seiten-Komponente
export default async function GorevEklemeSayfasi({ params: { locale } }: GorevEklemeSayfasiProps) {
  noStore(); // Caching deaktivieren

  // --- KORREKTUR 2: Supabase Client in Page Component ---
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // --- ENDE KORREKTUR ---

  // Benutzerprüfung (optional, aber empfohlen, da Layout es vielleicht schon macht)
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) { return redirect(`/${locale}/login`); }

  // Parallele Abfragen für Dropdowns
  const [profillerRes, firmalarRes] = await Promise.all([
      supabase.from('profiller').select('id, tam_ad').order('tam_ad'),
      supabase.from('firmalar').select('id, unvan').order('unvan')
  ]);

  const profilOptions: ProfilOption[] = profillerRes.data || [];
  const firmaOptions: FirmaOption[] = firmalarRes.data || [];
  const oncelikOptions: GorevOncelik[] = ['Düşük', 'Orta', 'Yüksek']; // Aus Enum

  // Styling für Inputs
  const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400"; // Styling angepasst

  // Action mit Locale binden
  const gorevEkleActionWithLocale = gorevEkleAction.bind(null, locale);

  return (
    <>
      <header className="mb-8">
        {/* Link zur sprachspezifischen Liste */}
        <Link href={`/${locale}/admin/gorevler`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-4">
          <FiArrowLeft />
          Zurück zur Aufgabenliste
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Neue Aufgabe erstellen</h1>
        <p className="text-text-main/80 mt-1">Füllen Sie die Details aus, um eine neue Aufgabe zuzuweisen.</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
        <form action={gorevEkleActionWithLocale} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

            {/* Titel */}
            <div className="md:col-span-2">
              <label htmlFor="baslik" className="block text-sm font-bold text-gray-700 mb-2">Titel <span className="text-red-500">*</span></label>
              <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} placeholder="z.B. Kampagnen-Visuals vorbereiten"/>
            </div>

            {/* Beschreibung */}
            <div className="md:col-span-2">
              <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-2">Beschreibung</label>
              <textarea id="aciklama" name="aciklama" rows={4} className={inputBaseClasses} placeholder="Details und Anforderungen der Aufgabe..."/>
            </div>

            {/* Zugewiesen an */}
            <div>
              <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-gray-700 mb-2">Zugewiesen an <span className="text-red-500">*</span></label>
              <select id="atanan_kisi_id" name="atanan_kisi_id" required className={inputBaseClasses}>
                <option value="">-- Person auswählen --</option>
                {profilOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.tam_ad}</option>
                ))}
              </select>
            </div>

            {/* Zugehörige Firma */}
            <div>
              <label htmlFor="ilgili_firma_id" className="block text-sm font-bold text-gray-700 mb-2">Zugehörige Firma (Optional)</label>
              <select id="ilgili_firma_id" name="ilgili_firma_id" className={inputBaseClasses}>
                <option value="">-- Firma auswählen --</option>
                {firmaOptions.map(f => (
                  <option key={f.id} value={f.id}>{f.unvan}</option>
                ))}
              </select>
            </div>

            {/* Priorität */}
            <div>
              <label htmlFor="oncelik" className="block text-sm font-bold text-gray-700 mb-2">Priorität</label>
              <select id="oncelik" name="oncelik" required defaultValue="Orta" className={inputBaseClasses}>
                {oncelikOptions.map(o => (
                  // Übersetzungen (optional)
                  <option key={o} value={o}>{o === 'Düşük' ? 'Niedrig' : o === 'Orta' ? 'Mittel' : 'Hoch'}</option>
                ))}
              </select>
            </div>

            {/* Fällig am */}
            <div>
              <label htmlFor="son_tarih" className="block text-sm font-bold text-gray-700 mb-2">Fällig am</label>
              <input type="date" id="son_tarih" name="son_tarih" className={inputBaseClasses} />
            </div>
          </div>

          {/* Absenden-Button */}
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm">
              <FiSave size={18} />
              Aufgabe speichern
            </button>
          </div>
        </form>
      </div>
    </>
  );
}