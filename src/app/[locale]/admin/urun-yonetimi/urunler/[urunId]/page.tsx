// src/app/[locale]/admin/urun-yonetimi/urunler/[urunId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
// KORREKTUR: Korrekten Pfad zur UrunFormu verwenden
import { UrunFormu } from '../urun-formu';
import { Tables, Database } from '@/lib/supabase/database.types'; // Database importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Locale importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { getDictionary } from '@/dictionaries';

// Typdefinitionen
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

// Props-Typ für die Seite
interface UrunBearbeitenSeiteProps {
    params: Promise<{
        urunId: string;
        locale: Locale; // Korrekten Typ verwenden
    }>;
    searchParams?: Promise<{
        from?: string;
        to?: string;
        tip?: string;
        kaynak?: string;
    }>;
}

export default async function UrunBearbeitenSeite({ params, searchParams }: UrunBearbeitenSeiteProps) { // Typ verwenden
    noStore(); // Caching deaktivieren
    const { urunId, locale } = await params; // urunId und locale aus params extrahieren
    const sp = searchParams ? await searchParams : {};

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    const serviceSupabase = createSupabaseServiceClient();
    // --- ENDE KORREKTUR ---

    // Sicherheit: Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Rollenprüfung: Nur Yönetici kann düzenlemeler yapabilir
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isAdmin = profile?.rol === 'Yönetici';

    // Daten parallel abrufen: Produkt, Kategorien, Lieferanten, Einheiten
    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        // Produkt mit Kategorie-ID abrufen
        supabase.from('urunler').select('*').eq('id', urunId).maybeSingle(),
        // Kategorien nach lokalisiertem Namen sortieren
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        // Einheiten nach lokalisiertem Namen sortieren
        supabase.from('birimler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`)
    ]);

    const mevcutUrun = urunRes.data as Urun | null;

    // Fehlerbehandlung: Produkt nicht gefunden
    if (urunRes.error || !mevcutUrun) {
        console.error("Fehler beim Laden des Produkts:", urunRes.error);
        return notFound(); // Standard 404 Seite anzeigen
    }

    // Kategorie-ID extrahieren (wichtig für Sablon-Abruf)
    const kategorieId = mevcutUrun.kategori_id;
    let sablon: Sablon[] = []; // Initialisiere als leeres Array

    if (kategorieId) {
        // Sablon nur abrufen, wenn eine Kategorie-ID vorhanden ist
        const { data: sablonData, error: sablonError } = await supabase
            .from('kategori_ozellik_sablonlari')
            .select('*')
            .eq('kategori_id', kategorieId)
            .order('sira', { ascending: true });

        if (sablonError) {
            console.error("Fehler beim Laden des Sablons:", sablonError);
            // Fehler anzeigen, aber Seite trotzdem rendern (ohne technische Felder)
        } else {
            sablon = sablonData || [];
        }
    } else {
        console.warn(`Produkt ${urunId} hat keine Kategorie-ID.`);
    }

    // Daten für das Formular vorbereiten
    const kategorien = kategorilerRes.data || [];
    const tedarikciler = tedarikcilerRes.data || [];
    const birimler = birimlerRes.data || [];

    const dict = await getDictionary(locale);
    const labels = dict.productsForm;

        let stockLogsQuery = (serviceSupabase as any)
            .from('urun_stok_hareket_loglari')
            .select('id, created_at, hareket_tipi, kaynak, miktar, birim, birim_miktar, onceki_stok, sonraki_stok, yapan_user_adi, yapan_user_email, aciklama')
            .eq('urun_id', urunId);

        const fromDate = (sp?.from || '').trim();
        const toDate = (sp?.to || '').trim();
        const tip = (sp?.tip || '').trim();
        const kaynak = (sp?.kaynak || '').trim();

        if (fromDate) {
            stockLogsQuery = stockLogsQuery.gte('created_at', `${fromDate}T00:00:00`);
        }
        if (toDate) {
            stockLogsQuery = stockLogsQuery.lte('created_at', `${toDate}T23:59:59`);
        }
        if (tip) {
            stockLogsQuery = stockLogsQuery.eq('hareket_tipi', tip);
        }
        if (kaynak) {
            stockLogsQuery = stockLogsQuery.eq('kaynak', kaynak);
        }

        const { data: stockLogsRaw } = await stockLogsQuery
            .order('created_at', { ascending: false })
            .limit(100);

        const stockLogs = Array.isArray(stockLogsRaw) ? stockLogsRaw : [];

    // UrunFormu aufrufen und alle Daten übergeben
    return (
        <div className="max-w-5xl mx-auto">
            {/* Stellen Sie sicher, dass 'UrunFormu' eine Client-Komponente ist
              und die Logik zum Abrufen des Sablons jetzt im Client (useEffect) liegt,
              oder übergeben Sie 'sablon' als serverSablon={sablon}
            */}
            <UrunFormu
                locale={locale} // locale übergeben
                mevcutUrun={mevcutUrun}
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                labels={labels}
                isAdmin={isAdmin}
                // serverSablon={sablon} // Übergeben, falls UrunFormu dies erwartet
            />

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Stok Hareket Logları</h2>
                    <span className="text-xs text-slate-500">Filtreye göre son 100 kayıt</span>
                </div>

                <form method="get" className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Başlangıç</label>
                        <input name="from" type="date" defaultValue={fromDate} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Bitiş</label>
                        <input name="to" type="date" defaultValue={toDate} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Hareket tipi</label>
                        <select name="tip" defaultValue={tip} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            <option value="">Tümü</option>
                            <option value="stok_artisi">stok_artisi</option>
                            <option value="stok_azalisi">stok_azalisi</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Kaynak</label>
                        <select name="kaynak" defaultValue={kaynak} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            <option value="">Tümü</option>
                            <option value="supplier_order_receipt">supplier_order_receipt</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                            Filtrele
                        </button>
                        <a href={`/${locale}/admin/urun-yonetimi/urunler/${urunId}`} className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                            Temizle
                        </a>
                    </div>
                </form>

                {stockLogs.length === 0 ? (
                    <p className="text-sm text-slate-600">Bu ürün için henüz stok hareket kaydı bulunmuyor.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-600">
                                    <th className="px-2 py-2">Tarih</th>
                                    <th className="px-2 py-2">Hareket</th>
                                    <th className="px-2 py-2 text-right">Miktar</th>
                                    <th className="px-2 py-2 text-right">Önceki</th>
                                    <th className="px-2 py-2 text-right">Sonraki</th>
                                    <th className="px-2 py-2">Yapan</th>
                                    <th className="px-2 py-2">Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-slate-100 align-top">
                                        <td className="px-2 py-2 whitespace-nowrap text-slate-700">
                                            {new Date(log.created_at).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-2 py-2 text-slate-700">
                                            {log.hareket_tipi} · {log.kaynak}
                                        </td>
                                        <td className="px-2 py-2 text-right font-medium text-emerald-700">
                                            +{Number(log.miktar || 0).toLocaleString('tr-TR')} {log.birim || ''}
                                        </td>
                                        <td className="px-2 py-2 text-right text-slate-700">
                                            {Number(log.onceki_stok || 0).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                                            {Number(log.sonraki_stok || 0).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-2 py-2 text-slate-700">
                                            <div>{log.yapan_user_adi || '-'}</div>
                                            <div className="text-xs text-slate-500">{log.yapan_user_email || '-'}</div>
                                        </td>
                                        <td className="px-2 py-2 text-slate-600">
                                            {log.aciklama || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}