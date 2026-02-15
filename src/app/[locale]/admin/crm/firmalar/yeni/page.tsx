// src/app/[locale]/admin/crm/firmalar/yeni/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient + Google Maps Feld)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database, Tables, Enums, TablesInsert } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiMapPin, FiInstagram, FiFacebook, FiGlobe } from 'react-icons/fi'; // FiMapPin eklendi
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import AddressAutofill from '@/components/AddressAutofill'; // Import AddressAutofill

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
  const ticari_tip_raw = formData.get('ticari_tip') as string | null;
  // --- YENİ ALANLAR ---
  const google_maps_url = formData.get('google_maps_url') as string;
  const sehir = formData.get('sehir') as string;
  const ilce = formData.get('ilce') as string;
  const mahalle = formData.get('mahalle') as string; // New field
  const posta_kodu = formData.get('posta_kodu') as string;
  const yetkili_kisi = formData.get('yetkili_kisi') as string;
  const etiketler = formData.getAll('etiketler') as string[]; // Multi-select
  const kaynak = formData.get('kaynak') as string; // Yeni Kaynak Alanı
  const is_rejected = formData.get('is_rejected') === 'on';
  const instagram_url = formData.get('instagram_url') as string;
  const facebook_url = formData.get('facebook_url') as string;
  const web_url = formData.get('web_url') as string;
  // --- BİTTİ ---

  // 2. Gerekli doğrulamaları yap
  if (!unvan || !kategori) {
    console.error("Firma Unvanı ve Kategori zorunludur.");
    // TODO: Hata yönetimi (useFormState ile daha iyi olur)
    return;
  }

  const ticari_tip = ticari_tip_raw || (kategori === 'Alt Bayi' ? 'alt_bayi' : 'musteri');

  // --- KORREKTUR (ACTION): Supabase Client korrekt initialisieren ---
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  // --- ENDE KORREKTUR ---

  // 3. Oturum açmış kullanıcıyı ve rolünü al
  const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
  if (!user) return redirect(`/${locale}/login`); // Sprachspezifischer Redirect

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;

  // --- DUPLICATE CHECK ---
  // Check if a company with the same name or Google Maps URL already exists
  const conditions = [`unvan.ilike."${unvan.replace(/"/g, '')}"`]; // Simple sanitization
  if (google_maps_url) {
      conditions.push(`google_maps_url.eq."${google_maps_url}"`);
  }
  
  const { data: existingFirma } = await supabase
      .from('firmalar')
      .select('id, unvan')
      .or(conditions.join(','))
      .maybeSingle();

  if (existingFirma) {
      // Redirect back with error
      return redirect(`/${locale}/admin/crm/firmalar/yeni?error=duplicate&duplicate_id=${existingFirma.id}&duplicate_name=${encodeURIComponent(existingFirma.unvan)}`);
  }
  // --- END DUPLICATE CHECK ---

  // 4. Veritabanına eklenecek veriyi hazırla
  const insertData: TablesInsert<'firmalar'> = {
    unvan,
    kategori,
    adres: adres || null,
    telefon: telefon || null,
    email: email || null,
    status: is_rejected ? 'REDDEDİLDİ' : 'ADAY',
    google_maps_url: google_maps_url || null,
    sehir: sehir || null,
    ilce: ilce || null,
    mahalle: mahalle || null, // New field
    posta_kodu: posta_kodu || null,
    yetkili_kisi: yetkili_kisi || null,
    etiketler: etiketler.length > 0 ? etiketler : null,
    kaynak: kaynak || null, // Kaynak eklendi
    instagram_url: instagram_url || null,
    facebook_url: facebook_url || null,
    web_url: web_url || null,
  };
  (insertData as any).ticari_tip = ticari_tip;
  (insertData as any).created_by = user.id;
  (insertData as any).goruldu = true;

  // --- SCORING LOGIC (YENİ SISTEM) ---
  // Kategori base puanı
  const KATEGORI_BASE_PUAN: Record<string, number> = {
      'A': 85,  // HACİM KRALLARI (80-100)
      'B': 65,  // GÜNLÜK NAKİT AKIŞI (60-79)
      'C': 45,  // NİŞ PAZARLAR (40-59)
      'D': 20   // PERAKENDE & RAF (1-39)
  };

  const KATEGORI_ARALIK: Record<string, { min: number; max: number }> = {
      'A': { min: 80, max: 100 },
      'B': { min: 60, max: 79 },
      'C': { min: 40, max: 59 },
      'D': { min: 1, max: 39 }
  };

  const ETIKET_PUANLARI: Record<string, number> = {
      '#Yüksek_Sirkülasyon': 15,
      '#Vitrin_Boş': 15,
      '#Türk_Sahibi': 8,
      '#Yeni_Açılış': 8,
      '#Lüks_Mekan': 5,
      '#Teraslı': 5,
      '#Mutfak_Yok': 5,
      '#Kendi_Üretimi': -10
  };

  let score = KATEGORI_BASE_PUAN[kategori] || 50;

  // Etiketlerden puan ekle
  if (etiketler && etiketler.length > 0) {
      for (const etiket of etiketler) {
          const etiketPuan = ETIKET_PUANLARI[etiket];
          if (etiketPuan !== undefined) {
              score += etiketPuan;
          }
      }
  }
  
  // Kategori aralığını aşmaması gerekli
  const aralik = KATEGORI_ARALIK[kategori];
  if (aralik) {
      score = Math.max(aralik.min, Math.min(aralik.max, score));
  }
  
  insertData.oncelik_puani = score;
  // --- END SCORING ---

  // 5. Akıllı Atama Kuralı'nı uygula
  if (userRole === 'Ekip Üyesi' || userRole === 'Personel') {
    insertData.sorumlu_personel_id = user.id; // Spalte heißt 'sorumlu_personel_id'
  } else if (userRole === 'Yönetici' && sorumlu_personel_id) {
    insertData.sorumlu_personel_id = sorumlu_personel_id;
  }

  // CRITICAL FIX: Müşteri oluşturan kullanıcıyı sahip olarak ata
  // Alt Bayiler için: Müşteriyi oluşturan alt bayi kullanıcısına sahiplik ata
  if (ticari_tip === 'musteri') {
    // Get user's profile to check their firma_id (if they're an alt bayi)
    const { data: userProfile } = await supabase
      .from('profiller')
      .select('id, firma_id, rol')
      .eq('id', user.id)
      .single();

    // If user is Alt Bayi, set sahip_id to their user ID
    if (userProfile?.rol === 'Alt Bayi') {
      insertData.sahip_id = user.id;
    }
    // For admin/team members, sahip_id remains null (owned by admin)
  }

  // 6. Veritabanına kaydet
  const { error } = await supabase.from('firmalar').insert(insertData);

  // 7. Hata kontrolü ve yönlendirme
  if (error) {
    console.error('Firma eklenirken hata oluştu:', error.message);
    // TODO: Hata yönetimi
  } else {
    revalidatePath(`/${locale}/admin/crm/firmalar`); // Sprachspezifischer Pfad
    revalidatePath(`/${locale}/admin/crm/alt-bayiler`); // Sprachspezifischer Pfad
    redirect(ticari_tip === 'alt_bayi'
      ? `/${locale}/admin/crm/alt-bayiler`
      : `/${locale}/admin/crm/firmalar`
    );
  }
}

// Props-Typ für die Seite
interface YeniFirmaEklePageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// YENİ FİRMA EKLEME SAYFASI BİLEŞENİ
export default async function YeniFirmaEklePage({ params, searchParams }: YeniFirmaEklePageProps) {
  noStore(); // Caching deaktivieren
  
  // Await params and searchParams for Next.js 15
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const prefillTicariTip = Array.isArray(resolvedSearchParams.ticari_tip)
    ? resolvedSearchParams.ticari_tip[0]
    : resolvedSearchParams.ticari_tip;
  const isAltBayiPrefill = prefillTicariTip === 'alt_bayi';

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
  const kategoriOptions: FirmaKategori[] = [
      "A",
      "B",
      "C",
      "D"
  ];

  const kategoriLabels: Record<string, string> = {
      "A": "🔥 HACİM KRALLARI (Ana Kategori A) - Düğün, Catering, Büyük Oteller",
      "B": "💰 GÜNLÜK NAKİT AKIŞI (Ana Kategori B) - Kafeler, Pastaneler, AVM",
      "C": "⭐ NİŞ PAZARLAR (Ana Kategori C) - Restoran, Lounge, Specialty",
      "D": "📦 PERAKENDE & RAF (Ana Kategori D) - Marketler, Kiosks, Benzin İstasyonları"
  };
  
  const tagOptions = [
      "#Yüksek_Sirkülasyon", "#Vitrin_Boş", "#Yeni_Açılış", "#Türk_Sahibi", 
      "#Lüks_Mekan", "#Teraslı", "#Mutfak_Yok", "#Kendi_Üretimi"
  ];

  const kaynakOptions = [
      "Google Maps", "Instagram", "Saha Ziyareti", "Referans", "Web", "Diğer"
  ];
  
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

      {/* Duplicate Warning */}
      {resolvedSearchParams?.error === 'duplicate' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-pulse">
              <div className="text-red-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
              </div>
              <div>
                  <h3 className="text-sm font-bold text-red-800">Bu firma zaten kayıtlı!</h3>
                  <p className="text-sm text-red-700 mt-1">
                      <strong>{searchParams.duplicate_name}</strong> isimli firma sistemde mevcut.
                  </p>
                  <div className="mt-2">
                      <Link 
                          href={`/${locale}/admin/crm/firmalar/${searchParams.duplicate_id}`}
                          className="text-sm font-medium text-red-800 underline hover:text-red-900"
                      >
                          Mevcut firmayı görüntüle &rarr;
                      </Link>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
        <form action={yeniFirmaEkleActionWithLocale}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            <div className="md:col-span-2">
              <label htmlFor="unvan" className={labelBaseClasses}>Firmenname <span className="text-red-500">*</span></label>
              <input type="text" id="unvan" name="unvan" required className={inputBaseClasses} placeholder="z.B. Café Lecker"/>
            </div>

            <div>
              <label htmlFor="kategori" className={labelBaseClasses}>Kategorie <span className="text-red-500">*</span></label>
              <input type="hidden" name="ticari_tip" value={isAltBayiPrefill ? 'alt_bayi' : ''} />
              <select id="kategori" name="kategori" required className={inputBaseClasses} defaultValue={isAltBayiPrefill ? 'Alt Bayi' : ''}>
                <option value="">-- Kategorie wählen --</option>
                {kategoriOptions.map(cat => (
                    <option key={cat} value={cat}>
                        {kategoriLabels[cat] || cat}
                    </option>
                ))}
              </select>

              {/* Rejected Checkbox */}
              <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-100">
                  <label className="inline-flex items-center gap-2 cursor-pointer w-full">
                      <input type="checkbox" name="is_rejected" className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
                      <span className="text-sm font-bold text-red-800">Bu işletme ile ilgilenilmeyecek (Reddedildi)</span>
                  </label>
                  <p className="text-xs text-red-600 mt-1 ml-6">
                      İşaretlenirse, bu kayıt listelerde en sona atılır ve işlem yapılmaz.
                  </p>
              </div>
            </div>

            <div>
              <label htmlFor="kaynak" className={labelBaseClasses}>Quelle (Source)</label>
              <select id="kaynak" name="kaynak" className={inputBaseClasses}>
                <option value="">-- Wie gefunden? --</option>
                {kaynakOptions.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="yetkili_kisi" className={labelBaseClasses}>Entscheider (Decision Maker)</label>
              <input type="text" id="yetkili_kisi" name="yetkili_kisi" className={inputBaseClasses} placeholder="z.B. Max Mustermann"/>
            </div>

            <div className="md:col-span-2">
              <label className={labelBaseClasses}>Tags (Mehrfachauswahl)</label>
              <div className="flex flex-wrap gap-3">
                  {tagOptions.map(tag => (
                      <label key={tag} className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full cursor-pointer hover:bg-gray-200 transition">
                          <input type="checkbox" name="etiketler" value={tag} className="rounded text-accent focus:ring-accent" />
                          <span className="text-sm font-medium text-gray-700">{tag}</span>
                      </label>
                  ))}
              </div>
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

            {/* --- YENİ ALANLAR: Adres Detayları (Auto-fill) --- */}
            <AddressAutofill />
            {/* --- BİTTİ --- */}

            <div className="md:col-span-2">
              <label htmlFor="adres" className={labelBaseClasses}>Adresse (Straße & Nr.)</label>
              <textarea id="adres" name="adres" rows={3} className={inputBaseClasses} placeholder="Musterstraße 123..."/>
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
              <p className="text-xs text-gray-500 mt-1">
                Wenn Sie eine Google Maps URL eingeben, werden Stadt und Bezirk automatisch ausgefüllt (falls leer).
              </p>
            </div>
            {/* --- BİTTİ --- */}

            {/* --- YENİ ALANLAR: Sosyal Medya & Web --- */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-1">Dijital Varlıklar (Sosyal Medya & Web)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="instagram_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                    <FiInstagram size={14} /> Instagram
                  </label>
                  <input 
                    type="url" 
                    id="instagram_url" 
                    name="instagram_url" 
                    className={inputBaseClasses} 
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="facebook_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                    <FiFacebook size={14} /> Facebook
                  </label>
                  <input 
                    type="url" 
                    id="facebook_url" 
                    name="facebook_url" 
                    className={inputBaseClasses} 
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="web_url" className={`${labelBaseClasses} inline-flex items-center gap-2`}>
                    <FiGlobe size={14} /> Website
                  </label>
                  <input 
                    type="url" 
                    id="web_url" 
                    name="web_url" 
                    className={inputBaseClasses} 
                    placeholder="https://www.firma.de"
                  />
                </div>
              </div>
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
