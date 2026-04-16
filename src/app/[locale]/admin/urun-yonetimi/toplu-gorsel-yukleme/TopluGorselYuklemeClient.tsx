'use client';

import { useRef, useState, useCallback } from 'react';
import { FiUploadCloud, FiCheckCircle, FiXCircle, FiAlertTriangle, FiImage, FiLoader, FiInfo, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';
import {
  sorguStokKodulariAction,
  tekDosyaYukleAction,
  gorselGuncelleAction,
  type UrunEslesmeSonucu,
} from './actions';

// ─── Yardımcı: dosya adından stok kodu ve tip çıkar ───────────────────────
// Kural: {STOK_KODU}-main.jpg | {STOK_KODU}-1.jpg | {STOK_KODU}-2.jpg
// Stok kodunda tire olabilir (örn. PASTA-001-main.jpg)
// Son "-{tip}" kısmı ayrılır, geri kalanı stok kodu

function dosyaAdiniCoz(fileName: string): { stokKodu: string; tip: string } | null {
  const base = fileName.replace(/\.[^/.]+$/, ''); // uzantıyı sil
  const lastDash = base.lastIndexOf('-');
  if (lastDash === -1) return null;

  const tip = base.slice(lastDash + 1).toLowerCase();
  const stokKodu = base.slice(0, lastDash).toUpperCase();

  if (!stokKodu) return null;

  // tip: 'main', '1', '2', '3', ...
  const gecerliTip = tip === 'main' || /^\d+$/.test(tip);
  if (!gecerliTip) return null;

  return { stokKodu, tip };
}

// ─── Tipler ─────────────────────────────────────────────────────────────────

type DosyaItem = {
  file: File;
  stokKodu: string;
  tip: string; // 'main' | '1' | '2' ...
  eslesmeVar: boolean;
  urunId?: string;
  urunAdi?: string;
  durum: 'bekliyor' | 'yukleniyor' | 'tamamlandi' | 'hata';
  hataDetay?: string;
  url?: string;
};

type AsamaType = 'secim' | 'onizleme' | 'yukleniyor' | 'sonuc';

export default function TopluGorselYuklemeClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [asama, setAsama] = useState<AsamaType>('secim');
  const [dosyalar, setDosyalar] = useState<DosyaItem[]>([]);
  const [eslesmeSonuclari, setEslesmeSonuclari] = useState<UrunEslesmeSonucu[]>([]);
  const [bulunamayan, setBulunamayan] = useState<string[]>([]);
  const [gecersizdosyalar, setGecersizdosyalar] = useState<string[]>([]);
  const [sorgulanıyor, setSorgulanıyor] = useState(false);
  const [yuklenenSayac, setYuklenenSayac] = useState(0);
  const [toplamYuklenecek, setToplamYuklenecek] = useState(0);

  // ─── Dosya seçimi ────────────────────────────────────────────────────────

  const handleDosyaSec = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const eslesen: DosyaItem[] = [];
    const gecersiz: string[] = [];

    for (const file of Array.from(files)) {
      const cozum = dosyaAdiniCoz(file.name);
      if (!cozum) {
        gecersiz.push(file.name);
        continue;
      }
      eslesen.push({
        file,
        stokKodu: cozum.stokKodu,
        tip: cozum.tip,
        eslesmeVar: false,
        durum: 'bekliyor',
      });
    }

    setDosyalar(eslesen);
    setGecersizdosyalar(gecersiz);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleDosyaSec(e.dataTransfer.files);
    },
    [handleDosyaSec]
  );

  // ─── Önizleme: stok kodlarını sorgula ───────────────────────────────────

  const handleOnizleme = async () => {
    if (dosyalar.length === 0) {
      toast.error('Önce dosya seçin.');
      return;
    }
    setSorgulanıyor(true);
    try {
      const stokKodlari = [...new Set(dosyalar.map(d => d.stokKodu))];
      const sonuc = await sorguStokKodulariAction(stokKodlari);

      if ('hata' in sonuc && sonuc.hata) {
        toast.error(`Sunucu hatası: ${sonuc.hata}`);
        setSorgulanıyor(false);
        return;
      }

      setEslesmeSonuclari(sonuc.eslesen);
      setBulunamayan(sonuc.bulunamayan);

      const eslesmMap = new Map(sonuc.eslesen.map(e => [e.stok_kodu.toUpperCase(), e]));
      setDosyalar(prev =>
        prev.map(d => {
          const eslesme = eslesmMap.get(d.stokKodu.toUpperCase());
          return eslesme
            ? { ...d, eslesmeVar: true, urunId: eslesme.urun_id, urunAdi: eslesme.urun_adi }
            : { ...d, eslesmeVar: false };
        })
      );

      setSorgulanıyor(false);
      setAsama('onizleme');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
      toast.error(`Hata: ${msg}`);
      setSorgulanıyor(false);
    }
  };

  // ─── Yükleme ─────────────────────────────────────────────────────────────

  const handleYukle = async () => {
    const yuklenecekler = dosyalar.filter(d => d.eslesmeVar);
    if (yuklenecekler.length === 0) {
      toast.error('Sistemde eşleşen ürün bulunamadı.');
      return;
    }

    setAsama('yukleniyor');
    setToplamYuklenecek(yuklenecekler.length);
    setYuklenenSayac(0);

    // urunId → { anaResimUrl, galeriEkle } toplama map'i
    const urunGorselMap = new Map<
      string,
      { anaResimUrl: string | null; galeriEkle: string[] }
    >();

    // Dosyaları sıralı yükle
    for (let i = 0; i < dosyalar.length; i++) {
      const dosya = dosyalar[i];
      if (!dosya.eslesmeVar || !dosya.urunId) continue;

      // Durumu 'yukleniyor' yap
      setDosyalar(prev =>
        prev.map((d, idx) => (idx === i ? { ...d, durum: 'yukleniyor' } : d))
      );

      const formData = new FormData();
      formData.append('file', dosya.file);
      formData.append('stok_kodu', dosya.stokKodu);
      formData.append('tip', dosya.tip);

      const sonuc = await tekDosyaYukleAction(formData);

      if (!sonuc.success) {
        setDosyalar(prev =>
          prev.map((d, idx) =>
            idx === i ? { ...d, durum: 'hata', hataDetay: sonuc.message } : d
          )
        );
        setYuklenenSayac(c => c + 1);
        continue;
      }

      // Başarılı → url kaydet
      setDosyalar(prev =>
        prev.map((d, idx) =>
          idx === i ? { ...d, durum: 'tamamlandi', url: sonuc.url } : d
        )
      );

      // Map'e ekle
      const mevcut = urunGorselMap.get(dosya.urunId) || { anaResimUrl: null, galeriEkle: [] };
      if (dosya.tip === 'main') {
        mevcut.anaResimUrl = sonuc.url;
      } else {
        mevcut.galeriEkle.push(sonuc.url);
      }
      urunGorselMap.set(dosya.urunId, mevcut);

      setYuklenenSayac(c => c + 1);
    }

    // Tüm dosyalar yüklendi → DB güncelle (ürün başına tek istek)
    for (const [urunId, gorsel] of urunGorselMap.entries()) {
      await gorselGuncelleAction({
        urunId,
        anaResimUrl: gorsel.anaResimUrl,
        galeriEkle: gorsel.galeriEkle,
      });
    }

    setAsama('sonuc');
    toast.success('Yükleme tamamlandı!');
  };

  // ─── Sıfırla ─────────────────────────────────────────────────────────────

  const handleSifirla = () => {
    setDosyalar([]);
    setEslesmeSonuclari([]);
    setBulunamayan([]);
    setGecersizdosyalar([]);
    setYuklenenSayac(0);
    setToplamYuklenecek(0);
    setAsama('secim');
    if (inputRef.current) inputRef.current.value = '';
  };

  // ─── Sayaçlar ────────────────────────────────────────────────────────────

  const eslenenDosyaSayisi = dosyalar.filter(d => d.eslesmeVar).length;
  const hataliDosyaSayisi = dosyalar.filter(d => d.durum === 'hata').length;
  const tamamlananDosyaSayisi = dosyalar.filter(d => d.durum === 'tamamlandi').length;
  const mainDosyaSayisi = dosyalar.filter(d => d.eslesmeVar && d.tip === 'main').length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Kural Kutusu */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <FiInfo className="mt-0.5 shrink-0" size={16} />
          <div className="space-y-1">
            <p className="font-semibold">Dosya adı kuralı:</p>
            <p>
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">STOKKODU-main.jpg</code>
              {' '}→ Ana görsel &nbsp;|&nbsp;
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">STOKKODU-1.jpg</code>
              {', '}
              <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">STOKKODU-2.jpg</code>
              {' '}→ Galeri görseli
            </p>
            <p className="text-xs text-blue-700">Desteklenen: <strong>JPG, PNG, WEBP</strong> &nbsp;·&nbsp; Maks. boyut: <strong>10 MB</strong></p>
          </div>
        </div>
      </div>

      {/* AŞAMA 1: Dosya Seçimi */}
      {(asama === 'secim') && (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center transition hover:border-slate-400 hover:bg-slate-100 cursor-pointer"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <FiUploadCloud size={48} className="text-slate-400" />
          <div>
            <p className="text-lg font-semibold text-slate-700">Dosyaları buraya sürükle</p>
            <p className="text-sm text-slate-500">veya tıklayarak seç</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={e => handleDosyaSec(e.target.files)}
          />
        </div>
      )}

      {/* Seçilen dosyalar özeti (secim aşamasında) */}
      {asama === 'secim' && dosyalar.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {dosyalar.length} dosya seçildi
              {gecersizdosyalar.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ({gecersizdosyalar.length} geçersiz isim)
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleSifirla}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
            >
              <FiTrash2 size={12} /> Temizle
            </button>
          </div>

          {/* Geçersiz isimler uyarısı */}
          {gecersizdosyalar.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Kurala uymayan dosya adları (atlanacak):</p>
              {gecersizdosyalar.slice(0, 10).map(f => (
                <p key={f} className="font-mono">• {f}</p>
              ))}
              {gecersizdosyalar.length > 10 && (
                <p className="text-amber-600">...ve {gecersizdosyalar.length - 10} tane daha</p>
              )}
            </div>
          )}

          {/* Dosya listesi (ilk 20) */}
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
            {dosyalar.slice(0, 50).map((d, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5">
                <span className="font-mono text-slate-700">{d.file.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${d.tip === 'main' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                    {d.tip === 'main' ? 'Ana Görsel' : `Galeri ${d.tip}`}
                  </span>
                  <span className="text-slate-400 font-mono">{d.stokKodu}</span>
                </div>
              </div>
            ))}
            {dosyalar.length > 50 && (
              <div className="px-3 py-2 text-slate-400 text-center">
                ...ve {dosyalar.length - 50} dosya daha
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleOnizleme}
            disabled={sorgulanıyor}
            className="w-full rounded-lg bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sorgulanıyor ? <FiLoader className="animate-spin" /> : <FiImage />}
            {sorgulanıyor ? 'Ürünler kontrol ediliyor...' : 'Önizlemeyi Göster'}
          </button>
        </div>
      )}

      {/* AŞAMA 2: Önizleme */}
      {asama === 'onizleme' && (
        <div className="space-y-4">
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatKart renk="emerald" sayi={eslenenDosyaSayisi} label="Eşleşen Dosya" />
            <StatKart renk="sky" sayi={mainDosyaSayisi} label="Ana Görsel" />
            <StatKart renk="violet" sayi={dosyalar.filter(d => d.eslesmeVar && d.tip !== 'main').length} label="Galeri Görseli" />
            <StatKart renk="red" sayi={bulunamayan.length + gecersizdosyalar.length} label="Eşleşmeyen" />
          </div>

          {/* Eşleşen ürünler tablosu */}
          {eslesmeSonuclari.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                ✅ Sisteme yüklenecek — {eslesmeSonuclari.length} ürün
              </p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Stok Kodu</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Ürün Adı</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600">Ana</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600">Galeri</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600">Üzerine Yazılacak?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eslesmeSonuclari.map(e => {
                      const buDosyalar = dosyalar.filter(d => d.stokKodu === e.stok_kodu);
                      const anaVarmi = buDosyalar.some(d => d.tip === 'main');
                      const galeriDosyalari = buDosyalar.filter(d => d.tip !== 'main');
                      return (
                        <tr key={e.urun_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-slate-800">{e.stok_kodu}</td>
                          <td className="px-3 py-2 text-slate-600">{e.urun_adi}</td>
                          <td className="px-3 py-2 text-center">
                            {anaVarmi ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {galeriDosyalari.length > 0 ? (
                              <span className="text-sky-600 font-bold">+{galeriDosyalari.length}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {anaVarmi && e.mevcut_ana_resim ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Evet</span>
                            ) : (
                              <span className="text-slate-300">Hayır</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulunamayan stok kodları */}
          {bulunamayan.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <FiXCircle size={13} /> Sistemde bulunamayan stok kodları ({bulunamayan.length}):
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {bulunamayan.map(k => (
                  <span key={k} className="rounded bg-red-100 px-1.5 py-0.5 font-mono">{k}</span>
                ))}
              </div>
              <p className="mt-2 text-red-600">Bu stok kodlarına ait dosyalar atlanacak.</p>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSifirla}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FiRefreshCw size={14} /> Baştan Başla
            </button>
            <button
              type="button"
              onClick={handleYukle}
              disabled={eslenenDosyaSayisi === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <FiUploadCloud size={16} />
              {eslenenDosyaSayisi} dosyayı yükle
            </button>
          </div>
        </div>
      )}

      {/* AŞAMA 3: Yükleniyor */}
      {asama === 'yukleniyor' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <FiLoader size={36} className="animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-800">Yükleniyor...</p>
            <p className="text-sm text-slate-500 mt-1">
              {yuklenenSayac} / {toplamYuklenecek} dosya işlendi
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: toplamYuklenecek > 0 ? `${(yuklenenSayac / toplamYuklenecek) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Dosya durumu listesi */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
            {dosyalar.filter(d => d.eslesmeVar).map((d, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                {d.durum === 'bekliyor' && <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />}
                {d.durum === 'yukleniyor' && <FiLoader size={14} className="animate-spin text-blue-500 shrink-0" />}
                {d.durum === 'tamamlandi' && <FiCheckCircle size={14} className="text-emerald-500 shrink-0" />}
                {d.durum === 'hata' && <FiXCircle size={14} className="text-red-500 shrink-0" />}
                <span className="font-mono text-slate-700 flex-1 truncate">{d.file.name}</span>
                {d.durum === 'hata' && (
                  <span className="text-red-600 text-[10px]">{d.hataDetay}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AŞAMA 4: Sonuç */}
      {asama === 'sonuc' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <FiCheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-emerald-800">Yükleme Tamamlandı!</p>
            <p className="text-sm text-emerald-700 mt-2">
              {tamamlananDosyaSayisi} görsel başarıyla yüklendi ve ürünlere bağlandı.
            </p>
            {hataliDosyaSayisi > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {hataliDosyaSayisi} dosyada hata oluştu.
              </p>
            )}
          </div>

          {/* Detay tablosu */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-3">
              <p className="text-2xl font-bold text-emerald-700">{tamamlananDosyaSayisi}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Başarılı</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 py-3">
              <p className="text-2xl font-bold text-red-700">{hataliDosyaSayisi}</p>
              <p className="text-xs text-red-600 mt-0.5">Hatalı</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 py-3">
              <p className="text-2xl font-bold text-slate-700">{bulunamayan.length}</p>
              <p className="text-xs text-slate-600 mt-0.5">Eşleşmedi</p>
            </div>
          </div>

          {/* Hatalı dosyalar */}
          {hataliDosyaSayisi > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold mb-2">Hatalı Dosyalar:</p>
              {dosyalar
                .filter(d => d.durum === 'hata')
                .map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-mono">{d.file.name}</span>
                    <span className="text-red-600">{d.hataDetay}</span>
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSifirla}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FiRefreshCw size={14} /> Yeni Yükleme
            </button>
            <a
              href="../urunler"
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Ürün Listesine Git
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Küçük istatistik kartı bileşeni ────────────────────────────────────────

function StatKart({
  renk,
  sayi,
  label,
}: {
  renk: 'emerald' | 'sky' | 'violet' | 'red';
  sayi: number;
  label: string;
}) {
  const renkMap = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${renkMap[renk]}`}>
      <p className="text-2xl font-bold">{sayi}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
