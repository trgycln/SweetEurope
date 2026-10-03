/**
 * Merkezi fiyat hesaplama utility'si.
 *
 * Veritabanı fiyat alanları (adet başına €):
 *   satis_fiyati_musteri   → 1-4 koli standart fiyat
 *   satis_fiyati_toptanci  → 5+ koli toptan fiyat
 *   satis_fiyati_alt_bayi  → Palet fiyatı (en ucuz kademe)
 *
 * Birim hiyerarşisi:
 *   palet > koli > adet
 *   1 palet  = palet_ici_koli_adet koli  (veya palet_ici_adet adet)
 *   1 koli   = koli_ici_adet adet
 */

export type Birim = 'adet' | 'koli' | 'palet';

interface UrunFiyatBilgi {
    koli_ici_adet?: number | null;
    palet_ici_adet?: number | null;
    palet_ici_koli_adet?: number | null;
    satis_fiyati_musteri?: number | null;
    satis_fiyati_toptanci?: number | null;
    satis_fiyati_alt_bayi?: number | null;
    satis_fiyati_palet?: number | null;
    partnerPreis?: number | null;
    userRole?: string | null;
}

// ── Yardımcı getter'lar ──────────────────────────────────────────────

/** 1 kolideki adet sayısı */
export function getKoliIciAdet(urun: UrunFiyatBilgi): number {
    return Number(urun.koli_ici_adet ?? 1);
}

/** 1 paletteki koli sayısı */
export function getPaletIciKoliAdet(urun: UrunFiyatBilgi): number {
    const paletIciKoli = Number(urun.palet_ici_koli_adet ?? 0);
    if (paletIciKoli > 0) return paletIciKoli;

    // DB'de palet_ici_adet = 1 paletteki KOLİ sayısıdır (örn. 125 koli/palet).
    // Toplam adet = palet_ici_adet × koli_ici_adet (bkz. KatalogProductCard).
    const paletIciAdet = Number(urun.palet_ici_adet ?? 0);
    return paletIciAdet > 0 ? paletIciAdet : 0;
}

/** 1 paletteki toplam adet sayısı */
export function getPaletToplamAdet(urun: UrunFiyatBilgi): number {
    return getPaletIciKoliAdet(urun) * getKoliIciAdet(urun);
}

/** Ürünün palet satışı destekleyip desteklemediği */
export function hasPaletOption(urun: UrunFiyatBilgi): boolean {
    return getPaletIciKoliAdet(urun) > 0;
}

// ── Toplam adet hesabı ─────────────────────────────────────────────

/**
 * Seçilen birim ve miktara göre toplam adet sayısını hesaplar.
 * @param urun   Ürün bilgisi
 * @param birim  'adet' | 'koli' | 'palet'
 * @param miktar Birim cinsinden miktar (kaç koli, kaç palet, kaç adet)
 */
export function hesaplaToplamAdet(urun: UrunFiyatBilgi, birim: Birim, miktar: number): number {
    const koliAdet = getKoliIciAdet(urun);
    if (birim === 'palet') {
        const paletToplamAdet = getPaletToplamAdet(urun);
        return paletToplamAdet > 0 ? paletToplamAdet * miktar : koliAdet * miktar;
    }
    if (birim === 'koli') return koliAdet * miktar;
    return miktar; // adet
}

// ── Birim fiyat hesabı (adet başına €) ─────────────────────────────

/**
 * Kademe bazlı adet fiyatını döndürür.
 * @param urun       Ürün bilgisi
 * @param birim      Seçilen birim
 * @param koliMiktar Koli cinsinden miktar (birim='palet' ise palet × paletIciKoli)
 * @param userRole   Kullanıcı rolü (Alt Bayi ise en ucuz bayi fiyatı geçerlidir)
 */
export function hesaplaBirimFiyat(
    urun: UrunFiyatBilgi,
    birim: Birim,
    koliMiktar: number,
    userRole?: string | null,
): number {
    const role = userRole ?? urun.userRole;
    // 1) Alt Bayi ise: her zaman satis_fiyati_alt_bayi alır (paletten de ucuz)
    if (role === 'Alt Bayi') {
        return Number(urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_palet ?? urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    }

    const paletIciKoli = getPaletIciKoliAdet(urun);

    // 2) Palet miktarına ulaşıldıysa: satis_fiyati_palet
    if (paletIciKoli > 0 && koliMiktar >= paletIciKoli) {
        return Number(urun.satis_fiyati_palet ?? urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    }
    
    // 3) 5+ koli → toptan fiyat
    if (koliMiktar >= 5) {
        return Number(urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    }
    
    // 4) Standart 1-4 koli fiyatı
    return Number(urun.satis_fiyati_musteri ?? urun.partnerPreis ?? 0);
}

/**
 * Koli miktarını birim ve miktardan hesaplar (fiyat kademe tespiti için).
 */
export function hesaplaKoliMiktar(urun: UrunFiyatBilgi, birim: Birim, miktar: number): number {
    if (birim === 'palet') return getPaletIciKoliAdet(urun) * miktar;
    if (birim === 'koli') return miktar;
    // adet modunda: kaç koli ediyorsa onu hesapla
    const koliAdet = getKoliIciAdet(urun);
    return koliAdet > 0 ? Math.floor(miktar / koliAdet) : 0;
}

// ── Aktif kademe bilgisi ───────────────────────────────────────────

export type FiyatKademe = 'musteri' | 'toptanci' | 'palet';

export function getAktifKademe(urun: UrunFiyatBilgi, koliMiktar: number): FiyatKademe {
    const paletIciKoli = getPaletIciKoliAdet(urun);
    if (paletIciKoli > 0 && koliMiktar >= paletIciKoli) return 'palet';
    if (koliMiktar >= 5) return 'toptanci';
    return 'musteri';
}

// ── Komple sepet satırı hesabı ─────────────────────────────────────

export interface SepetHesap {
    toplamAdet: number;
    koliMiktar: number;
    adetFiyat: number;
    toplamFiyat: number;
    kademe: FiyatKademe;
    koliIciAdet: number;
    paletIciKoliAdet: number;
}

export function hesaplaSepetSatiri(
    urun: UrunFiyatBilgi,
    birim: Birim,
    miktar: number,
    userRole?: string | null,
): SepetHesap {
    const koliIciAdet = getKoliIciAdet(urun);
    const paletIciKoliAdet = getPaletIciKoliAdet(urun);
    const toplamAdet = hesaplaToplamAdet(urun, birim, miktar);
    const koliMiktar = hesaplaKoliMiktar(urun, birim, miktar);
    const adetFiyatUnrounded = hesaplaBirimFiyat(urun, birim, koliMiktar, userRole);
    const adetFiyat = Number(Math.round(Number(adetFiyatUnrounded + 'e2')) + 'e-2');
    const toplamFiyat = Number(Math.round(Number((toplamAdet * adetFiyat) + 'e2')) + 'e-2');
    const kademe = getAktifKademe(urun, koliMiktar);

    return {
        toplamAdet,
        koliMiktar,
        adetFiyat,
        toplamFiyat,
        kademe,
        koliIciAdet,
        paletIciKoliAdet,
    };
}
