"use client";

import React from 'react'
import { Locale } from '@/i18n-config'
import { createAltBayiSatisAction } from '@/app/actions/alt-bayi-satis-actions'

export default function AltBayiYeniSatisFormClient({ locale, musteriler, urunler }: { locale: Locale, musteriler: any[], urunler: any[] }) {
  const [musteriId, setMusteriId] = React.useState('')
  const [kdv, setKdv] = React.useState(7)
  const [rows, setRows] = React.useState<Array<{ urun_id: string, adet: number, birim?: number }>>([])
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  const addRow = () => setRows(prev => [...prev, { urun_id: '', adet: 1 }])
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  const getUrun = (id: string) => urunler.find(u => u.id === id)

  const calc = React.useMemo(() => {
    const kdvRate = (Number(kdv) || 0) / 100
    let toplamNet = 0
    const lines = rows.map(r => {
      const u = getUrun(r.urun_id)
      const alis = Number(u?.satis_fiyati_alt_bayi) || 0
      const onerilen = round2(alis * 1.25)
      const birim = typeof r.birim === 'number' ? r.birim : onerilen
      const adet = Math.max(1, Number(r.adet) || 1)
      const satirNet = round2(birim * adet)
      const kdvTutar = round2(satirNet * kdvRate)
      const brut = round2(satirNet + kdvTutar)
      toplamNet += satirNet
      return { ...r, alis, onerilen, birim, satirNet, kdvTutar, brut }
    })
    const toplamKdv = round2(toplamNet * kdvRate)
    const toplamBrut = round2(toplamNet + toplamKdv)
    return { lines, toplamNet, toplamKdv, toplamBrut }
  }, [rows, urunler, kdv])

  async function handleSave() {
    if (!musteriId) { setMsg('Müşteri seçiniz.'); return }
    if (rows.length === 0) { setMsg('En az bir satır ekleyiniz.'); return }
    setSaving(true); setMsg(null)
    const payload = {
      musteri_id: musteriId,
      kdv_orani: (Number(kdv) || 0) / 100,
      satirlar: rows.map(r => ({ urun_id: r.urun_id, adet: Math.max(1, Number(r.adet) || 1), birim_fiyat_net: (typeof r.birim === 'number' ? r.birim : undefined) }))
    }
    const res = await createAltBayiSatisAction(payload)
    if (res.success) {
      setMsg('Kaydedildi.')
      // TODO: yönlendirme: /portal/finanslarim/satislar
    } else {
      setMsg(res.message || 'Hata!')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-primary">Yeni Satış / Ön Fatura</h1>

      <div className="bg-white border rounded p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
          <select value={musteriId} onChange={e => setMusteriId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">Seçiniz</option>
            {musteriler.map(m => <option key={m.id} value={m.id}>{m.unvan}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">KDV (%)</label>
          <input type="number" step={0.1} value={kdv} onChange={e => setKdv(Number(e.target.value) || 0)} className="w-40 border rounded px-3 py-2" />
        </div>
      </div>

      <div className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Satırlar</h2>
          <button onClick={addRow} className="px-3 py-1 rounded bg-accent text-white text-sm">Satır Ekle</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left">Ürün</th>
                <th className="px-2 py-1 text-left">Alış (€)</th>
                <th className="px-2 py-1 text-left">Önerilen Net (€)</th>
                <th className="px-2 py-1 text-left">Birim Net (€)</th>
                <th className="px-2 py-1 text-left">Adet</th>
                <th className="px-2 py-1 text-right">Satır Net</th>
                <th className="px-2 py-1 text-right">KDV</th>
                <th className="px-2 py-1 text-right">Satır Brüt</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {calc.lines.map((ln, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">
                    <select value={rows[idx]?.urun_id || ''} onChange={e => setRows(prev => prev.map((r,i) => i===idx? { ...r, urun_id: e.target.value }: r))} className="w-64 border rounded px-2 py-1">
                      <option value="">Seçiniz</option>
                      {urunler.map(u => <option key={u.id} value={u.id}>{(u.ad?.[locale] || u.stok_kodu || 'Ürün')}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">{ln.alis.toFixed(2)}</td>
                  <td className="px-2 py-1">{ln.onerilen.toFixed(2)}</td>
                  <td className="px-2 py-1">
                    <input type="number" step={0.01} value={rows[idx]?.birim ?? ln.onerilen} onChange={e => setRows(prev => prev.map((r,i) => i===idx? { ...r, birim: Number(e.target.value) }: r))} className="w-28 border rounded px-2 py-1"/>
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" step={1} min={1} value={rows[idx]?.adet || 1} onChange={e => setRows(prev => prev.map((r,i) => i===idx? { ...r, adet: Number(e.target.value) }: r))} className="w-20 border rounded px-2 py-1"/>
                  </td>
                  <td className="px-2 py-1 text-right">{ln.satirNet.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{ln.kdvTutar.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{ln.brut.toFixed(2)}</td>
                  <td className="px-2 py-1 text-center"><button onClick={() => removeRow(idx)} className="text-red-600 text-sm">Sil</button></td>
                </tr>
              ))}
              {calc.lines.length === 0 && (
                <tr><td className="px-2 py-6 text-center text-gray-500" colSpan={9}>Satır ekleyin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <div>Toplam Net: <span className="font-semibold text-primary">{calc.toplamNet.toFixed(2)} €</span></div>
          <div>KDV: <span className="font-semibold text-primary">{calc.toplamKdv.toFixed(2)} €</span></div>
          <div>Toplam Brüt: <span className="font-semibold text-primary">{calc.toplamBrut.toFixed(2)} €</span></div>
        </div>
        <button onClick={handleSave} disabled={saving || !musteriId || rows.length===0} className="px-4 py-2 rounded bg-green-600 text-white font-semibold disabled:opacity-50">Kaydet</button>
      </div>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  )
}

function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100 }
