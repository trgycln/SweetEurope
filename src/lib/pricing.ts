import { Enums, Tables } from '@/lib/supabase/database.types'

// Hybrid fiyat çözümleyici: 1) özel sabit fiyat 2) kategori kuralları 3) profil indirimi 4) baz fiyat
// Öncelik: Sabit Fiyat > Kategori Kuralı > Profil İndirimi > Baz Fiyat
export async function resolvePartnerPreis(options: {
  supabase: any,
  urun: Tables<'urunler'>,
  userRole: Enums<'user_role'>,
  firmaId: string,
  qty?: number,
}): Promise<number> {
  const { supabase, urun, userRole, firmaId } = options
  const qty = options.qty ?? 1

  // 0) Baz fiyat seçimi
  let base = userRole === 'Alt Bayi' ? urun.satis_fiyati_alt_bayi : urun.satis_fiyati_musteri

  // 0.1) Müşteri profil bilgisini al
  const { data: firma } = await (supabase as any)
    .from('firmalar')
    .select('musteri_profil_id, musteri_profilleri:musteri_profil_id(id, ad, genel_indirim_yuzdesi)')
    .eq('id', firmaId)
    .maybeSingle()
  
  const musteriProfili = firma?.musteri_profilleri

  // 1) Müşteri özel fiyat istisnası
  try {
    const { data: mfi } = await (supabase as any)
      .from('musteri_fiyat_istisnalari')
      .select('ozel_fiyat_net, baslangic_tarihi, bitis_tarihi')
      .eq('urun_id', urun.id)
      .eq('firma_id', firmaId)
      .eq('kanal', userRole)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (mfi) {
      const today = new Date()
      const startOk = !mfi.baslangic_tarihi || new Date(mfi.baslangic_tarihi) <= today
      const endOk = !mfi.bitis_tarihi || today <= new Date(mfi.bitis_tarihi)
      if (startOk && endOk && typeof mfi.ozel_fiyat_net === 'number') {
        return round2(mfi.ozel_fiyat_net)
      }
    }
  } catch {}

  // 2) Hybrid Kural Sistemi
  const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Yardımcı: kural getir (profil aware)
  async function getTopRule(filter: any) {
    let query = (supabase as any)
      .from('fiyat_kurallari')
      .select('yuzde_degisim, min_adet, oncelik, musteri_profil_id')
      .match({ aktif: true, kanal: userRole, ...filter })
      .or(`baslangic_tarihi.is.null,baslangic_tarihi.lte.${todayStr}`)
      .or(`bitis_tarihi.is.null,bitis_tarihi.gte.${todayStr}`)
      .lte('min_adet', qty)
    
    // Profil özel kuralları önce getir
    if (musteriProfili?.id) {
      query = query.or(`musteri_profil_id.is.null,musteri_profil_id.eq.${musteriProfili.id}`)
    } else {
      query = query.is('musteri_profil_id', null)
    }
    
    const { data } = await query
      .order('musteri_profil_id', { ascending: false, nullsLast: true }) // Profil özel kurallar önce
      .order('oncelik', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    return data as { yuzde_degisim: number; musteri_profil_id?: string } | null
  }

  let appliedRule: { yuzde_degisim: number; musteri_profil_id?: string } | null = null

  // Öncelik sırası: Ürün -> Kategori -> Global
  appliedRule = await getTopRule({ kapsam: 'urun', urun_id: urun.id })

  if (!appliedRule && urun.kategori_id) {
    appliedRule = await getTopRule({ kapsam: 'kategori', kategori_id: urun.kategori_id })
  }

  if (!appliedRule) {
    appliedRule = await getTopRule({ kapsam: 'global' })
  }

  // 3) Fiyat hesaplama
  let finalPrice = base

  // Önce kural indirimini uygula (eğer varsa)
  if (appliedRule && typeof appliedRule.yuzde_degisim === 'number') {
    const ruleRatio = 1 + (appliedRule.yuzde_degisim / 100)
    finalPrice = finalPrice * ruleRatio
  }

  // Sonra müşteri profil indirimini uygula (eğer kural profil özel değilse)
  if (musteriProfili?.genel_indirim_yuzdesi && (!appliedRule?.musteri_profil_id)) {
    const profilRatio = 1 + (musteriProfili.genel_indirim_yuzdesi / 100)
    finalPrice = finalPrice * profilRatio
  }

  return round2(finalPrice)
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
