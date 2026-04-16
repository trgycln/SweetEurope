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
