import React from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { unstable_noStore as noStore } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Locale } from '@/i18n-config'

export const dynamic = 'force-dynamic'

export default async function SatislarListPage({ params }: { params: { locale: Locale } }) {
  noStore()
  const { locale } = params
  const cookieStore = await cookies()
  const supabase = await createSupabaseServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="p-6">Giriş gerekli</div>
    )
  }

  const { data: profil } = await supabase
    .from('profiller')
    .select('id, rol, firma_id')
    .eq('id', user.id)
    .single()

  if (!profil?.firma_id) {
    return <div className="p-6">Firma bilgisi bulunamadı.</div>
  }

  // Bu alt bayinin satışları
  const { data: satislar } = await (supabase as any)
    .from('alt_bayi_satislar')
    .select('id, created_at, durum, toplam_net, toplam_kdv, toplam_brut, firmalar:musteri_id(unvan)')
    .eq('bayi_firma_id', profil.firma_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Satışlar (Ön Fatura)</h1>
          <p className="text-sm text-gray-600">Müşteri adına oluşturduğunuz satış kayıtları</p>
        </div>
        <Link href={`/${locale}/portal/finanslarim/satislar/yeni`} className="px-4 py-2 rounded bg-accent text-white font-semibold hover:bg-accent/90">Yeni Satış / Ön Fatura</Link>
      </div>

      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Tarih</th>
              <th className="px-4 py-2 text-left">Müşteri</th>
              <th className="px-4 py-2 text-left">Durum</th>
              <th className="px-4 py-2 text-right">Toplam Net (€)</th>
              <th className="px-4 py-2 text-right">KDV (€)</th>
              <th className="px-4 py-2 text-right">Toplam Brüt (€)</th>
            </tr>
          </thead>
          <tbody>
            {(satislar || []).length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Kayıt yok.</td>
              </tr>
            )}
            {(satislar || []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-2">{new Date(s.created_at).toLocaleString(locale === 'tr' ? 'tr-TR' : 'de-DE')}</td>
                <td className="px-4 py-2">{s.firmalar?.unvan || '-'}</td>
                <td className="px-4 py-2">{s.durum}</td>
                <td className="px-4 py-2 text-right">{Number(s.toplam_net).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{Number(s.toplam_kdv).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{Number(s.toplam_brut).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
