import React from 'react'
import { cookies } from 'next/headers'
import { unstable_noStore as noStore } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Locale } from '@/i18n-config'
import AltBayiYeniSatisFormClient from '@/components/portal/finans/AltBayiYeniSatisFormClient'

export const dynamic = 'force-dynamic'

export default async function YeniSatisPage({ params }: { params: { locale: Locale } }) {
  noStore()
  const { locale } = params
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="p-6">Giriş gerekli</div>
  }

  const { data: profil } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single()
  if (!profil?.firma_id) {
    return <div className="p-6">Firma bilgisi bulunamadı.</div>
  }

  const { data: musteriler } = await supabase
    .from('firmalar')
    .select('id, unvan')
    .order('unvan', { ascending: true })

  const { data: urunler } = await supabase
    .from('urunler')
    .select('id, ad, stok_kodu, satis_fiyati_alt_bayi')
    .eq('aktif', true)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <AltBayiYeniSatisFormClient locale={locale} musteriler={musteriler || []} urunler={urunler || []} />
  )
}
