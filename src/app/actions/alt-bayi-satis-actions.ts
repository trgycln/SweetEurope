'use server'

import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function createAltBayiSatisAction(payload: {
  musteri_id: string,
  kdv_orani?: number,
  satirlar: Array<{
    urun_id: string,
    adet: number,
    birim_fiyat_net?: number,
  }>
}) {
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Nicht authentifiziert.' }

  // Profil / bayi firma id al
  const { data: profil } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single()
  if (!profil?.firma_id) return { success: false, message: 'Firma bilgisi bulunamadı.' }

  const kdv = typeof payload.kdv_orani === 'number' ? payload.kdv_orani : 0.07

  // Önce satış başlığını oluştur
  const { data: satis, error: insErr } = await supabase
    .from('alt_bayi_satislar')
    .insert({ bayi_firma_id: profil.firma_id, musteri_id: payload.musteri_id, kdv_orani: kdv, durum: 'Taslak' })
    .select('*')
    .single()

  if (insErr || !satis) {
    return { success: false, message: 'Satış oluşturulamadı.' }
  }

  // Ürün fiyatlarını toplayıp satırları ekle
  let toplamNet = 0
  const detaylar: any[] = []

  for (const row of payload.satirlar) {
    const adet = Math.max(1, Number(row.adet) || 1)

    // Ürünü ve alt bayi alış fiyatını çek (snapshot için)
    const { data: urun } = await supabase
      .from('urunler')
      .select('id, satis_fiyati_alt_bayi')
      .eq('id', row.urun_id)
      .single()

    const alis = Number(urun?.satis_fiyati_alt_bayi) || 0

    // Önerilen fiyat: alış × 1.25; kullanıcı değer girdiyse onu al
    const onerilen = round2(alis * 1.25)
    const birim = typeof row.birim_fiyat_net === 'number' ? row.birim_fiyat_net : onerilen

    const satirNet = round2(birim * adet)
    const kdvTutar = round2(satirNet * kdv)
    const satirBrut = round2(satirNet + kdvTutar)

    toplamNet += satirNet

    detaylar.push({
      satis_id: satis.id,
      urun_id: row.urun_id,
      adet,
      birim_fiyat_net: birim,
      satir_net: satirNet,
      kdv_tutari: kdvTutar,
      satir_brut: satirBrut,
      alis_birim_fiyati: alis,
    })
  }

  if (detaylar.length > 0) {
    const { error: detErr } = await supabase.from('alt_bayi_satis_detay').insert(detaylar)
    if (detErr) {
      return { success: false, message: 'Satır eklenemedi.' }
    }
  }

  const toplamKdv = round2(toplamNet * kdv)
  const toplamBrut = round2(toplamNet + toplamKdv)

  const { error: upErr } = await supabase
    .from('alt_bayi_satislar')
    .update({ toplam_net: toplamNet, toplam_kdv: toplamKdv, toplam_brut: toplamBrut })
    .eq('id', satis.id)

  if (upErr) return { success: false, message: 'Toplam güncellenemedi.' }

  return { success: true, id: satis.id }
}

export async function updateAltBayiSatisDurumAction(satisId: string, durum: 'Taslak' | 'Onaylandı' | 'Faturalandı' | 'Iptal') {
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClient(cookieStore)

  const { error } = await supabase
    .from('alt_bayi_satislar')
    .update({ durum })
    .eq('id', satisId)

  if (error) return { success: false, message: 'Durum güncellenemedi.' }
  return { success: true }
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
