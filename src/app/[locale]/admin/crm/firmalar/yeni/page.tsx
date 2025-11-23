// src/app/[locale]/admin/crm/firmalar/yeni/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient + Google Maps Feld)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database, Tables, Enums, TablesInsert } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiMapPin } from 'react-icons/fi'; // FiMapPin eklendi
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Tip Tanımları
type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;
type UserRole = Enums<'user_role'>;
type FirmaKategori = Enums<'firma_kategori'>;

// SERVER ACTION: Form verisini alıp veritabanına işler.
async function yeniFirmaEkleAction(
    locale: Locale, // Locale für Redirect übergeben
    formData: FormData
) {
  'use server';

  // 1. Form verilerini çek
  const unvan = formData.get('unvan') as string;
  const kategori = formData.get('kategori') as FirmaKategori;
  const adres = formData.get('adres') as string;
  const telefon = formData.get('telefon') as string;
  const email = formData.get('email') as string;
  const sorumlu_personel_id = formData.get('sorumlu_personel_id') as string;
  // --- YENİ ALAN ---
  const google_maps_url = formData.get('google_maps_url') as string; // Yeni alanı al
  // --- BİTTİ ---

  // 2. Gerekli doğrulamaları yap
  if (!unvan || !kategori) {
    console.error("Firma Unvanı ve Kategori zorunludur.");
    // TODO: Hata yönetimi (useFormState ile daha iyi olur)
    return;
  }

  // --- KORREKTUR (ACTION): Supabase Client korrekt initialisieren ---
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // --- ENDE KORREKTUR ---

  // 3. Oturum açmış kullanıcıyı ve rolünü al
  const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
  if (!user) return redirect(`/${locale}/login`); // Sprachspezifischer Redirect

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;

  // 4. Veritabanına eklenecek veriyi hazırla
  const insertData: TablesInsert<'firmalar'> = {
    unvan,
    kategori,
    adres: adres || null,
    telefon: telefon || null,
    email: email || null,
    status: 'Aday', // Yeni CRM status - varsayılan aday
    // --- YENİ ALAN ---
    google_maps_url: google_maps_url || null, // Yeni alanı ekle
    // --- BİTTİ ---
  };

  // 5. Akıllı Atama Kuralı'nı uygula
  if (userRole === 'Ekip Üyesi') {
    insertData.sorumlu_personel_id = user.id; // Spalte heißt 'sorumlu_personel_id'
  } else if (userRole === 'Yönetici' && sorumlu_personel_id) {
    insertData.sorumlu_personel_id = sorumlu_personel_id;
  }

  // 6. Veritabanına kaydet
  const { error } = await supabase.from('firmalar').insert(insertData);

  // 7. Hata kontrolü ve yönlendirme
  if (error) {
    console.error('Firma eklenirken hata oluştu:', error.message);
    // TODO: Hata yönetimi
  } else {
    revalidatePath(`/${locale}/admin/crm/firmalar`); // Sprachspezifischer Pfad
    redirect(`/${locale}/admin/crm/firmalar`); // Sprachspezifischer Redirect
  }
}

// Props-Typ für die Seite
interface YeniFirmaEklePageProps {
    params: { locale: Locale };
    searchParams?: { [key: string]: string | string[] | undefined };
}

// YENİ FİRMA EKLEME SAYFASI BİLEŞENİ
export default async function YeniFirmaEklePage({ params: { locale } }: YeniFirmaEklePageProps) {
  noStore(); // Caching deaktivieren

  // --- KORREKTUR (PAGE): Supabase Client korrekt initialisieren ---
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // --- ENDE KORREKTUR ---

  const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
  if (!user) return redirect(`/${locale}/login`); // Sprachspezifischer Redirect

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole: UserRole | null = profile?.rol ?? null;
  
  // Sadece Admin ise tüm profilleri çek (Dropdown için)
  let profilOptions: ProfilOption[] = [];
  if (userRole === 'Yönetici') {
      const { data: profiller } = await supabase.from('profiller').select('id, tam_ad').order('tam_ad');
      profilOptions = profiller || [];
  }
  
  // Diğer dataları çek (Firmalar burada gerekli değil, sadece profiller)
  const kategoriOptions: FirmaKategori[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];
  
  // Stil tanımlamaları
  const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400";
  const labelBaseClasses = "block text-sm font-bold text-gray-700 mb-2";

  // Action'ı locale ile bağla
  const yeniFirmaEkleActionWithLocale = yeniFirmaEkleAction.bind(null, locale);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link href={`/${locale}/admin/crm/firmalar`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-4">
          <FiArrowLeft />
          Zurück zur Firmenliste
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Neue Firma hinzufügen</h1>
        <p className="text-text-main/80 mt-1">Einen neuen potenziellen Kunden registrieren.</p>
      </header>

      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
        <form action={yeniFirmaEkleActionWithLocale}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="md:col-span-2">
              <label htmlFor="unvan" className={labelBaseClasses}>Firmenname <span className="text-red-500">*</span></label>
              <input type="text" id="unvan" name="unvan" required className={inputBaseClasses} placeholder="z.B. Café Lecker"/>
            </div>

            <div>
              <label htmlFor="kategori" className={labelBaseClasses}>Kategorie <span className="text-red-500">*</span></label>
              <select id="kategori" name="kategori" required className={inputBaseClasses}>
                <option value="">-- Kategorie wählen --</option>
                {kategoriOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {userRole === 'Yönetici' ? (
              <div>
                <label htmlFor="sorumlu_personel_id" className={labelBaseClasses}>Verantwortlicher (Optional)</label>
                <select id="sorumlu_personel_id" name="sorumlu_personel_id" className={inputBaseClasses}>
                  <option value="">-- Mitarbeiter zuweisen --</option>
                  {profilOptions.map(p => <option key={p.id} value={p.id}>{p.tam_ad}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelBaseClasses}>Verantwortlicher</label>
                <div className={`${inputBaseClasses} bg-gray-200/50 cursor-not-allowed`}>
                  <p>Diese Firma wird Ihnen automatisch zugewiesen.</p>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className={labelBaseClasses}>E-Mail</label>
              <input type="email" id="email" name="email" className={inputBaseClasses} placeholder="kontakt@firma.de"/>
            </div>

            <div>
              <label htmlFor="telefon" className={labelBaseClasses}>Telefon</label>
              <input type="tel" id="telefon" name="telefon" className={inputBaseClasses} placeholder="+49 ..."/>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="adres" className={labelBaseClasses}>Adresse</label>
              <textarea id="adres" name="adres" rows={3} className={inputBaseClasses} placeholder="Firmenadresse..."/>
            </div>

            {/* --- YENİ ALAN: Google Maps --- */}
            <div className="md:col-span-2">
              <label htmlFor="google_maps_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                <FiMapPin size={14} /> Google Maps URL (Optional)
              </label>
              <input 
                type="url" 
                id="google_maps_url" 
                name="google_maps_url" 
                className={inputBaseClasses} 
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>
            {/* --- BİTTİ --- */}

          </div>

          <div className="pt-8 mt-6 border-t border-gray-200 flex justify-end gap-4">
            <Link href={`/${locale}/admin/crm/firmalar`} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors">
              Abbrechen
            </Link>
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm">
              <FiSave size={18} />
              Firma speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
