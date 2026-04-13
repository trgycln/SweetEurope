import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// ── Helpers ────────────────────────────────────────────────────────────────

function getLocalizedValue(json: unknown, locale: string, fallback = ''): string {
  if (!json || typeof json !== 'object') return typeof json === 'string' ? json : fallback;
  const obj = json as Record<string, string>;
  return obj[locale] || obj.tr || obj.de || obj.en || fallback;
}

function getTeknikOzellik(specs: unknown, key: string): unknown {
  if (!specs || typeof specs !== 'object') return null;
  return (specs as Record<string, unknown>)[key] ?? null;
}

function urunGamiToTip(urunGami: string | null): string {
  if (urunGami === 'donuk-urunler') return 'Donuk';
  if (urunGami === 'donuk-olmayan-urunler') return 'Donuk olmayan';
  return '';
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { data: profil } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    const allowedRoles = ['Yönetici', 'Personel', 'Ekip Üyesi'];
    if (!profil || !allowedRoles.includes(profil.rol)) {
      return NextResponse.json({ error: 'Bu işlem için yekiniz yok.' }, { status: 403 });
    }

    const canSeePurchasePrice = profil.rol !== 'Personel';

    // Query params
    const sp = request.nextUrl.searchParams;
    const locale = sp.get('locale') || 'tr';
    const tedarikciIdsRaw = sp.get('tedarikci_ids') || '';
    const kategoriIdsRaw = sp.get('kategori_ids') || '';
    const aktifParam = sp.get('aktif') || 'all'; // 'all' | '1' | '0'

    const tedarikciIds = tedarikciIdsRaw ? tedarikciIdsRaw.split(',').filter(Boolean) : [];
    const requestedKategoriIds = kategoriIdsRaw ? kategoriIdsRaw.split(',').filter(Boolean) : [];

    // Fetch all categories (to build parent/child tree & names)
    const { data: tumKategoriler } = await supabase
      .from('kategoriler')
      .select('id, ad, ust_kategori_id')
      .limit(2000);

    const allKategoriler = tumKategoriler || [];
    const kategoriById = new Map(allKategoriler.map((k) => [k.id, k]));

    // Expand selected category IDs to include all subcategory IDs
    const expandedKategoriIds = new Set<string>(requestedKategoriIds);
    if (requestedKategoriIds.length > 0) {
      for (const k of allKategoriler) {
        if (k.ust_kategori_id && expandedKategoriIds.has(k.ust_kategori_id)) {
          expandedKategoriIds.add(k.id);
        }
      }
    }

    // Fetch all suppliers
    const { data: tumTedarikciler } = await supabase
      .from('tedarikciler')
      .select('id, unvan')
      .limit(1000);

    const tedarikciById = new Map((tumTedarikciler || []).map((t) => [t.id, t.unvan || '']));

    // Build products query
    let query = supabase
      .from('urunler')
      .select(
        'id, stok_kodu, ad, aciklamalar, distributor_alis_fiyati, satis_fiyati_musteri, satis_fiyati_alt_bayi, stok_miktari, aktif, kategori_id, tedarikci_id, teknik_ozellikler, urun_gami',
      )
      .range(0, 4999);

    if (tedarikciIds.length > 0) {
      query = query.in('tedarikci_id', tedarikciIds);
    }
    if (expandedKategoriIds.size > 0) {
      query = query.in('kategori_id', [...expandedKategoriIds]);
    }
    if (aktifParam === '1') {
      query = query.eq('aktif', true);
    } else if (aktifParam === '0') {
      query = query.eq('aktif', false);
    }

    const { data: urunler, error: urunError } = await query;
    if (urunError || !urunler) {
      return NextResponse.json({ error: 'Ürünler yüklenemedi.' }, { status: 500 });
    }

    // Resolve category display names (parent → child split)
    function resolveCategoryNames(kategoriId: string | null) {
      if (!kategoriId) return { anakategori: '', altkategori: '' };
      const kat = kategoriById.get(kategoriId);
      if (!kat) return { anakategori: '', altkategori: '' };

      if (kat.ust_kategori_id) {
        const ust = kategoriById.get(kat.ust_kategori_id);
        return {
          anakategori: getLocalizedValue(ust?.ad, locale),
          altkategori: getLocalizedValue(kat.ad, locale),
        };
      }
      return { anakategori: getLocalizedValue(kat.ad, locale), altkategori: '' };
    }

    // Sort: supplier name → category name → product name
    const sorted = [...urunler].sort((a, b) => {
      const tA = tedarikciById.get(a.tedarikci_id ?? '') ?? '';
      const tB = tedarikciById.get(b.tedarikci_id ?? '') ?? '';
      if (tA !== tB) return tA.localeCompare(tB, 'tr');

      const { anakategori: cA, altkategori: scA } = resolveCategoryNames(a.kategori_id);
      const { anakategori: cB, altkategori: scB } = resolveCategoryNames(b.kategori_id);
      const catStr = (s: string, ss: string) => `${s} ${ss}`.trim();
      if (catStr(cA, scA) !== catStr(cB, scB)) return catStr(cA, scA).localeCompare(catStr(cB, scB), 'tr');

      return getLocalizedValue(a.ad, locale).localeCompare(getLocalizedValue(b.ad, locale), 'tr');
    });

    // Build Excel rows with import-compatible column names
    const rows = sorted.map((u) => {
      const specs = u.teknik_ozellikler as Record<string, unknown> | null;
      const { anakategori, altkategori } = resolveCategoryNames(u.kategori_id);
      const tedarikci = tedarikciById.get(u.tedarikci_id ?? '') ?? '';

      const row: Record<string, unknown> = {
        tedarikci,
        stok_kodu: u.stok_kodu ?? '',
        urun_adi_tr: getLocalizedValue(u.ad, 'tr'),
        urun_adi_de: getLocalizedValue(u.ad, 'de'),
        urun_adi_en: getLocalizedValue(u.ad, 'en'),
        urun_adi_ar: getLocalizedValue(u.ad, 'ar'),
        aciklama_tr: getLocalizedValue(u.aciklamalar, 'tr'),
        aciklama_de: getLocalizedValue(u.aciklamalar, 'de'),
        aciklama_en: getLocalizedValue(u.aciklamalar, 'en'),
        aciklama_ar: getLocalizedValue(u.aciklamalar, 'ar'),
        kategori: anakategori,
        alt_kategori: altkategori,
        urun_tipi: urunGamiToTip(u.urun_gami as string | null ?? getTeknikOzellik(specs, 'urun_tipi') as string | null),
        alis_fiyat_seviyesi: (getTeknikOzellik(specs, 'alis_fiyat_seviyesi') as string | null) ?? '',
        kutu_ici_adet: (getTeknikOzellik(specs, 'kutu_ici_adet') as number | null) ?? '',
        koli_ici_kutu: (getTeknikOzellik(specs, 'koli_ici_kutu_adet') as number | null) ?? '',
        palet_ici_koli: (getTeknikOzellik(specs, 'palet_ici_koli_adet') as number | null) ?? '',
        stok_miktari: u.stok_miktari ?? '',
        aktif: u.aktif ? 1 : 0,
      };

      if (canSeePurchasePrice) {
        row.alis_fiyati = u.distributor_alis_fiyati ?? '';
        row.satis_fiyati_musteri = u.satis_fiyati_musteri ?? '';
        row.satis_fiyati_alt_bayi = u.satis_fiyati_alt_bayi ?? '';
      }

      return row;
    });

    // Re-order columns so prices appear after urun_tipi (insertion order)
    const orderedRows = rows.map((row) => {
      const { alis_fiyati, satis_fiyati_musteri, satis_fiyati_alt_bayi, kutu_ici_adet, koli_ici_kutu, palet_ici_koli, stok_miktari, aktif, ...rest } = row;
      return {
        ...rest,
        ...(canSeePurchasePrice ? { alis_fiyati, satis_fiyati_musteri, satis_fiyati_alt_bayi } : {}),
        kutu_ici_adet,
        koli_ici_kutu,
        palet_ici_koli,
        stok_miktari,
        aktif,
      };
    });

    // Build XLSX
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(orderedRows);

    // Column widths
    const colWidths = [
      { wch: 20 }, // tedarikci
      { wch: 16 }, // stok_kodu
      { wch: 28 }, // urun_adi_tr
      { wch: 24 }, // urun_adi_de
      { wch: 24 }, // urun_adi_en
      { wch: 20 }, // urun_adi_ar
      { wch: 36 }, // aciklama_tr
      { wch: 30 }, // aciklama_de
      { wch: 30 }, // aciklama_en
      { wch: 24 }, // aciklama_ar
      { wch: 18 }, // kategori
      { wch: 20 }, // alt_kategori
      { wch: 16 }, // urun_tipi
      { wch: 18 }, // alis_fiyat_seviyesi
      ...(canSeePurchasePrice ? [{ wch: 14 }, { wch: 22 }, { wch: 22 }] : []),
      { wch: 13 }, // kutu_ici_adet
      { wch: 13 }, // koli_ici_kutu
      { wch: 13 }, // palet_ici_koli
      { wch: 13 }, // stok_miktari
      { wch: 8 },  // aktif
    ];
    sheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, sheet, 'urunler');

    // ── Info sheet ───────────────────────────────────────────────────────
    const infoRows = [
      { bilgi: 'Dışa Aktarım Tarihi', deger: new Date().toLocaleDateString('tr-TR') },
      { bilgi: 'Toplam Ürün Sayısı', deger: rows.length },
      { bilgi: 'Tedarikçi Filtresi', deger: tedarikciIds.length ? tedarikciIds.join(', ') : 'Tümü' },
      { bilgi: 'Kategori Filtresi', deger: requestedKategoriIds.length ? `${requestedKategoriIds.length} seçili` : 'Tümü' },
      { bilgi: 'Durum Filtresi', deger: aktifParam === '1' ? 'Sadece Aktif' : aktifParam === '0' ? 'Sadece Pasif' : 'Tümü' },
      { bilgi: '', deger: '' },
      { bilgi: 'ÖNEMLİ', deger: 'Bu dosya yeniden içe aktarmak için kullanılabilir. Boş hücreler eski değerini korur. stok_kodu eşleştirme anahtarıdır.' },
    ];
    const infoSheet = XLSX.utils.json_to_sheet(infoRows);
    infoSheet['!cols'] = [{ wch: 22 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'bilgi');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `urunler-export-${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[urun-export] hata:', err);
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}
