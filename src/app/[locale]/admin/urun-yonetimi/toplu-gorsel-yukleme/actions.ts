'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { slugify } from '@/lib/utils';

const BUCKET = 'urun-gorselleri';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// ─── Auth yardımcısı ────────────────────────────────────────────────────────
// Hem auth kontrolü yapar hem de supabase client'ı döner (tekrar oluşturmamak için)
async function ensureAdmin() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Yetkisiz erişim.' as const };

  const { data: profile } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (
    profile?.rol !== 'Yönetici' &&
    profile?.rol !== 'Personel' &&
    profile?.rol !== 'Ekip Üyesi'
  ) {
    return { error: 'Bu işlem için yetki gerekiyor.' as const };
  }
  return { supabase, userId: user.id };
}

// ─── Tip tanımları ───────────────────────────────────────────────────────────

export type UrunEslesmeSonucu = {
  stok_kodu: string;
  urun_id: string;
  urun_adi: string;
  mevcut_ana_resim: boolean;
  mevcut_galeri_sayisi: number;
};

export type StokKoduSorguSonucu = {
  eslesen: UrunEslesmeSonucu[];
  bulunamayan: string[];
};

// ─── Action 1: stok kodlarını sorgula (önizleme için) ──────────────────────

export async function sorguStokKodulariAction(
  stokKodulari: string[]
): Promise<StokKoduSorguSonucu & { hata?: string }> {
  try {
    const auth = await ensureAdmin();
    if ('error' in auth) return { eslesen: [], bulunamayan: stokKodulari, hata: auth.error };
    const { supabase } = auth;

    const temizKodlar = [...new Set(stokKodulari.map(k => k.trim().toUpperCase()))].filter(Boolean);
    if (!temizKodlar.length) return { eslesen: [], bulunamayan: [] };

    const { data: urunler, error: dbError } = await supabase
      .from('urunler')
      .select('id, stok_kodu, ad, ana_resim_url, galeri_resim_urls')
      .in('stok_kodu', temizKodlar)
      .limit(2000);

    if (dbError) {
      console.error('sorguStokKodulariAction DB hatası:', dbError);
      return { eslesen: [], bulunamayan: temizKodlar, hata: dbError.message };
    }

    const bulunanKodlar = new Set((urunler || []).map(u => (u.stok_kodu || '').toUpperCase()));
    const bulunamayan = temizKodlar.filter(k => !bulunanKodlar.has(k));

    const eslesen: UrunEslesmeSonucu[] = (urunler || []).map(u => ({
      stok_kodu: (u.stok_kodu || '').toUpperCase(),
      urun_id: u.id,
      urun_adi:
        (u.ad as any)?.tr ||
        (u.ad as any)?.de ||
        (u.ad as any)?.en ||
        'İsimsiz Ürün',
      mevcut_ana_resim: Boolean(u.ana_resim_url),
      mevcut_galeri_sayisi: Array.isArray(u.galeri_resim_urls)
        ? (u.galeri_resim_urls as string[]).length
        : 0,
    }));

    return { eslesen, bulunamayan };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sorguStokKodulariAction beklenmedik hata:', msg);
    return { eslesen: [], bulunamayan: stokKodulari, hata: msg };
  }
}

// ─── Action 2: tek dosya yükle + url döndür ─────────────────────────────────

export type TekDosyaYukleResult =
  | { success: true; url: string; storagePath: string }
  | { success: false; message: string };

export async function tekDosyaYukleAction(
  formData: FormData
): Promise<TekDosyaYukleResult> {
  try {
  const auth = await ensureAdmin();
  if ('error' in auth) return { success: false, message: auth.error };

  const file = formData.get('file');
  if (!(file instanceof File)) return { success: false, message: 'Geçerli bir dosya seçin.' };
  if (!ALLOWED_TYPES.has(file.type)) return { success: false, message: 'Sadece PNG, JPG, WEBP desteklenir.' };
  if (file.size > MAX_BYTES) return { success: false, message: 'Dosya 10 MB sınırını aşıyor.' };

  const stokKodu = String(formData.get('stok_kodu') || '').trim() || 'urun';
  const tip = String(formData.get('tip') || 'main'); // 'main' | '1' | '2' ...
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

  const safeKod = slugify(stokKodu) || 'urun';
  const storagePath = `toplu-yukleme/${safeKod}/${tip}-${Date.now()}.${ext}`;

  const serviceSupabase = createSupabaseServiceClient();
  const { data, error } = await serviceSupabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: true });

  if (error || !data) {
    return { success: false, message: error?.message || 'Yükleme başarısız.' };
  }

  const { data: urlData } = serviceSupabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return { success: true, url: urlData.publicUrl, storagePath: data.path };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('tekDosyaYukleAction beklenmedik hata:', msg);
    return { success: false, message: msg };
  }
}

// ─── Action 3: ürün görsel alanlarını güncelle ───────────────────────────────

export type GorselGuncelleInput = {
  urunId: string;
  anaResimUrl: string | null;
  galeriEkle: string[];   // mevcut galeriye EKLENECEKler
};

export type GorselGuncelleResult =
  | { success: true }
  | { success: false; message: string };

export async function gorselGuncelleAction(
  input: GorselGuncelleInput
): Promise<GorselGuncelleResult> {
  try {
  const auth = await ensureAdmin();
  if ('error' in auth) return { success: false, message: auth.error };
  const { supabase } = auth;

  // Mevcut galeriyi al
  const { data: mevcut } = await supabase
    .from('urunler')
    .select('galeri_resim_urls')
    .eq('id', input.urunId)
    .single();

  const mevcutGaleri: string[] = Array.isArray(mevcut?.galeri_resim_urls)
    ? (mevcut.galeri_resim_urls as string[])
    : [];

  const yeniGaleri = [...mevcutGaleri, ...input.galeriEkle];

  const updatePayload: Record<string, unknown> = { galeri_resim_urls: yeniGaleri };
  if (input.anaResimUrl !== null) {
    updatePayload.ana_resim_url = input.anaResimUrl;
  }

  const { error } = await supabase
    .from('urunler')
    .update(updatePayload)
    .eq('id', input.urunId);

  if (error) return { success: false, message: error.message };

  revalidatePath('/[locale]/admin/urun-yonetimi/urunler', 'layout');
  return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('gorselGuncelleAction beklenmedik hata:', msg);
    return { success: false, message: msg };
  }
}

// ─── Action 4: imgi_ format dosyalarını ürünlerle otomatik eşleştir ──────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export type ImgiEslestirSonucu = {
  dosyaAdi: string;
  eslesen: UrunEslesmeSonucu | null;
  puan: number; // 0-1 arasında güven skoru
};

export async function sorguImgiEslestirAction(
  dosyalar: { dosyaAdi: string; kelimeler: string[] }[]
): Promise<{ sonuclar: ImgiEslestirSonucu[]; hata?: string }> {
  try {
    const auth = await ensureAdmin();
    if ('error' in auth) return { sonuclar: [], hata: auth.error };
    const { supabase } = auth;

    if (!dosyalar.length) return { sonuclar: [] };

    const { data: urunler, error: dbError } = await supabase
      .from('urunler')
      .select('id, stok_kodu, ad, ana_resim_url, galeri_resim_urls')
      .limit(2000);

    if (dbError) return { sonuclar: [], hata: dbError.message };

    // Her ürün için kelime listesi hazırla (tüm diller birleştirilerek)
    const urunListesi = (urunler || []).map(u => {
      const ad = u.ad as Record<string, string> | string | null;
      const adWords: string[] = [];
      if (ad && typeof ad === 'object') {
        Object.values(ad).forEach(v => {
          if (v) normalizeText(String(v)).split(/\s+/).forEach(w => { if (w.length >= 2) adWords.push(w); });
        });
      } else if (typeof ad === 'string' && ad) {
        normalizeText(ad).split(/\s+/).forEach(w => { if (w.length >= 2) adWords.push(w); });
      }
      const adRec = (ad && typeof ad === 'object') ? (ad as Record<string, string>) : null;
      const stokKodu = (u.stok_kodu || '').toUpperCase();
      return {
        id: u.id as string,
        stokKodu,
        adWords,
        isFO: stokKodu.startsWith('FO'),
        urunAdi: adRec?.tr || adRec?.de || adRec?.en || 'İsimsiz Ürün',
        mevcutAna: Boolean(u.ana_resim_url),
        mevcutGaleri: Array.isArray(u.galeri_resim_urls) ? (u.galeri_resim_urls as string[]).length : 0,
      };
    });

    const sonuclar: ImgiEslestirSonucu[] = dosyalar.map(({ dosyaAdi, kelimeler }) => {
      if (!urunListesi.length) return { dosyaAdi, eslesen: null, puan: 0 };

      const normKelimeler = kelimeler.map(k => normalizeText(k)).filter(k => k.length >= 3);
      const normDosyaAdi = normalizeText(dosyaAdi);
      // Dosya adında "fo" marka işareti var mı?
      const isFoFile = /-fo-|-g-fo-|_fo_/.test(normDosyaAdi);

      let bestPuan = -1;
      let bestUrun: typeof urunListesi[number] | null = null;

      for (const urun of urunListesi) {
        let matchCount = 0;
        for (const k of normKelimeler) {
          // Çift yönlü prefix eşleştirme: "viskisi" ↔ "viski", "cikolata" ↔ "cikolatali"
          const matched = urun.adWords.some(aw => aw.startsWith(k) || k.startsWith(aw));
          if (matched) matchCount++;
        }
        let puan = normKelimeler.length > 0 ? matchCount / normKelimeler.length : 0;
        // FO marka bonusu
        if (isFoFile && urun.isFO) puan = Math.min(1, puan + 0.15);

        if (puan > bestPuan) { bestPuan = puan; bestUrun = urun; }
      }

      // Hiç kelime eşleşmesi yoksa (puan=0) → eslesen null, ama bestUrun'u bilgi olarak saklama
      if (!bestUrun || bestPuan <= 0) return { dosyaAdi, eslesen: null, puan: 0 };

      return {
        dosyaAdi,
        puan: Math.min(1, bestPuan),
        eslesen: {
          stok_kodu: bestUrun.stokKodu,
          urun_id: bestUrun.id,
          urun_adi: bestUrun.urunAdi,
          mevcut_ana_resim: bestUrun.mevcutAna,
          mevcut_galeri_sayisi: bestUrun.mevcutGaleri,
        },
      };
    });

    return { sonuclar };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sorguImgiEslestirAction beklenmedik hata:', msg);
    return { sonuclar: [], hata: msg };
  }
}
