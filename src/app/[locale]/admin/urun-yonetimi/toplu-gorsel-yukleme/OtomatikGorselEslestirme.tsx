'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import {
  FiUploadCloud,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiInfo,
  FiTrash2,
  FiRefreshCw,
  FiCheck,
} from 'react-icons/fi';
import { toast } from 'sonner';
import {
  sorguImgiEslestirAction,
  tekDosyaYukleAction,
  gorselGuncelleAction,
  type ImgiEslestirSonucu,
} from './actions';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const STOP_WORDS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'imgi', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
  'yy', 'gg', 'baz', 'base', 'png', 'jpg',
]);

// ─── Dosya adı çözümleyici ───────────────────────────────────────────────────
// Herhangi bir imgi_* resim dosyasını kabul eder.
// Anlamlı kelimeleri ön eke göre çıkarır: imgi_33_11002919-premium-beyaz-...
function imgiDosyaAdiniCoz(fileName: string): { kelimeler: string[] } | null {
  const lower = fileName.toLowerCase();
  if (!lower.startsWith('imgi_')) return null;
  const ext = lower.split('.').pop() ?? '';
  if (!ALLOWED_EXTS.has(ext)) return null;

  const base = fileName.replace(/\.[^/.]+$/, '');
  const withoutPrefix = base.replace(/^imgi_\d+_/i, '');

  const kelimeler = withoutPrefix
    .split(/[-_]+/)
    .map(w => w.toLowerCase())
    .filter(w => {
      if (w.length < 3) return false;
      if (/^\d+$/.test(w)) return false;           // salt sayı (2024, 1500)
      if (/^\d+[a-z]{1,3}$/.test(w)) return false; // 700ml, 1kg, 70cl
      if (STOP_WORDS.has(w)) return false;
      return true;
    });

  return { kelimeler };
}

// ─── Tipler ──────────────────────────────────────────────────────────────────

type OtoDosyaItem = {
  file: File;
  kelimeler: string[];
  durum: 'bekliyor' | 'yukleniyor' | 'tamamlandi' | 'hata';
  eslesme?: ImgiEslestirSonucu;
  hataDetay?: string;
  url?: string;
};

type AsamaType = 'secim' | 'onizleme' | 'yukleniyor' | 'sonuc';

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export default function OtomatikGorselEslestirme() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [asama, setAsama] = useState<AsamaType>('secim');
  const [dosyalar, setDosyalar] = useState<OtoDosyaItem[]>([]);
  const [gecersizDosyalar, setGecersizDosyalar] = useState<string[]>([]);
  const [onaylananlar, setOnaylananlar] = useState<Set<string>>(new Set());
  const [sorgulanıyor, setSorgulanıyor] = useState(false);
  const [yuklenenSayac, setYuklenenSayac] = useState(0);
  const [toplamYuklenecek, setToplamYuklenecek] = useState(0);

  // ─── Dosya seçimi ──────────────────────────────────────────────────────

  const handleDosyaSec = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const eslesen: OtoDosyaItem[] = [];
    const gecersiz: string[] = [];
    for (const file of Array.from(files)) {
      const cozum = imgiDosyaAdiniCoz(file.name);
      if (!cozum) { gecersiz.push(file.name); continue; }
      eslesen.push({ file, kelimeler: cozum.kelimeler, durum: 'bekliyor' });
    }
    setDosyalar(eslesen);
    setGecersizDosyalar(gecersiz);
    setOnaylananlar(new Set());
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleDosyaSec(e.dataTransfer.files);
  }, [handleDosyaSec]);

  // ─── Eşleştirme ────────────────────────────────────────────────────────

  const handleOnizleme = async () => {
    if (dosyalar.length === 0) { toast.error('Önce dosya seçin.'); return; }
    setSorgulanıyor(true);
    try {
      const girdi = dosyalar.map(d => ({ dosyaAdi: d.file.name, kelimeler: d.kelimeler }));
      const sonuc = await sorguImgiEslestirAction(girdi);
      if (sonuc.hata) { toast.error(`Sunucu hatası: ${sonuc.hata}`); setSorgulanıyor(false); return; }

      const sonucMap = new Map(sonuc.sonuclar.map(s => [s.dosyaAdi, s]));
      const guncelDosyalar = dosyalar.map(d => ({ ...d, eslesme: sonucMap.get(d.file.name) }));
      setDosyalar(guncelDosyalar);

      // Varsayılan: %50 ve üzeri güven → otomatik seçili
      setOnaylananlar(new Set(
        guncelDosyalar
          .filter(d => d.eslesme?.eslesen && (d.eslesme.puan ?? 0) >= 0.5)
          .map(d => d.file.name)
      ));
      setSorgulanıyor(false);
      setAsama('onizleme');
    } catch (e) {
      toast.error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
      setSorgulanıyor(false);
    }
  };

  // ─── Onay toggle ───────────────────────────────────────────────────────

  const toggleOnay = (dosyaAdi: string) => {
    setOnaylananlar(prev => {
      const next = new Set(prev);
      if (next.has(dosyaAdi)) next.delete(dosyaAdi); else next.add(dosyaAdi);
      return next;
    });
  };

  const eslenenDosyalar = dosyalar.filter(d => d.eslesme?.eslesen);
  const eslenmeyenDosyalar = dosyalar.filter(d => d.eslesme && !d.eslesme.eslesen);

  const tumunuSec = () => setOnaylananlar(new Set(eslenenDosyalar.map(d => d.file.name)));
  const tumunuKaldir = () => setOnaylananlar(new Set());
  const yuksekGuvenSec = () => setOnaylananlar(new Set(
    eslenenDosyalar.filter(d => (d.eslesme?.puan ?? 0) >= 0.5).map(d => d.file.name)
  ));

  // ─── Tip hesaplama (approved sırasına göre Ana/Galeri) ─────────────────

  const tipMap = useMemo(() => {
    const seenAna = new Set<string>();
    const map = new Map<string, 'Ana' | 'Galeri'>();
    dosyalar
      .filter(d => d.eslesme?.eslesen && onaylananlar.has(d.file.name))
      .forEach(d => {
        const { urun_id, mevcut_ana_resim } = d.eslesme!.eslesen!;
        if (!seenAna.has(urun_id) && !mevcut_ana_resim) {
          seenAna.add(urun_id);
          map.set(d.file.name, 'Ana');
        } else {
          map.set(d.file.name, 'Galeri');
        }
      });
    return map;
  }, [dosyalar, onaylananlar]);

  // ─── Yükleme ───────────────────────────────────────────────────────────

  const handleYukle = async () => {
    const yuklenecekler = dosyalar.filter(d => d.eslesme?.eslesen && onaylananlar.has(d.file.name));
    if (yuklenecekler.length === 0) { toast.error('Onaylanan dosya yok.'); return; }

    setAsama('yukleniyor');
    setToplamYuklenecek(yuklenecekler.length);
    setYuklenenSayac(0);

    const urunGorselMap = new Map<
      string,
      { anaResimUrl: string | null; galeriEkle: string[]; anaSet: boolean; mevcutAna: boolean }
    >();

    for (let i = 0; i < dosyalar.length; i++) {
      const dosya = dosyalar[i];
      if (!dosya.eslesme?.eslesen || !onaylananlar.has(dosya.file.name)) continue;

      const { urun_id: urunId, stok_kodu: stokKodu, mevcut_ana_resim: mevcutAna } = dosya.eslesme.eslesen;
      if (!urunGorselMap.has(urunId)) {
        urunGorselMap.set(urunId, { anaResimUrl: null, galeriEkle: [], anaSet: false, mevcutAna });
      }
      const urunGorsel = urunGorselMap.get(urunId)!;
      const setAsMain = !urunGorsel.anaSet && !urunGorsel.mevcutAna;

      setDosyalar(prev => prev.map((d, idx) => idx === i ? { ...d, durum: 'yukleniyor' } : d));

      const fd = new FormData();
      fd.append('file', dosya.file);
      fd.append('stok_kodu', stokKodu.toLowerCase());
      fd.append('tip', setAsMain ? 'main' : 'galeri');

      const sonuc = await tekDosyaYukleAction(fd);

      if (!sonuc.success) {
        setDosyalar(prev => prev.map((d, idx) => idx === i ? { ...d, durum: 'hata', hataDetay: sonuc.message } : d));
        setYuklenenSayac(c => c + 1);
        continue;
      }

      setDosyalar(prev => prev.map((d, idx) => idx === i ? { ...d, durum: 'tamamlandi', url: sonuc.url } : d));

      if (setAsMain) { urunGorsel.anaResimUrl = sonuc.url; urunGorsel.anaSet = true; }
      else { urunGorsel.galeriEkle.push(sonuc.url); }
      urunGorselMap.set(urunId, urunGorsel);
      setYuklenenSayac(c => c + 1);
    }

    for (const [urunId, gorsel] of urunGorselMap.entries()) {
      await gorselGuncelleAction({ urunId, anaResimUrl: gorsel.anaResimUrl, galeriEkle: gorsel.galeriEkle });
    }

    setAsama('sonuc');
    toast.success('Yükleme tamamlandı!');
  };

  // ─── Sıfırla ───────────────────────────────────────────────────────────

  const handleSifirla = () => {
    setDosyalar([]); setGecersizDosyalar([]); setOnaylananlar(new Set());
    setYuklenenSayac(0); setToplamYuklenecek(0); setAsama('secim');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onaylananSayisi = onaylananlar.size;
  const tamamlananSayisi = dosyalar.filter(d => d.durum === 'tamamlandi').length;
  const hataliSayisi = dosyalar.filter(d => d.durum === 'hata').length;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Bilgi kutusu */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800">
        <div className="flex items-start gap-2">
          <FiInfo className="mt-0.5 shrink-0" size={16} />
          <div className="space-y-1">
            <p className="font-semibold">Otomatik Eşleştirme — Dosya adına göre ürün tespiti</p>
            <p className="text-xs text-violet-700">
              Resimler dosya adındaki kelimelerle sistemimizdeki ürün adlarıyla karşılaştırılır.
              Her eşleşmeyi ayrı ayrı onaylayabilir veya reddedebilirsiniz.
              Onaylanan ilk resim <strong>Ana Görsel</strong>, kalanlar <strong>Galeri</strong> olur.
            </p>
            <p className="text-xs text-violet-600 font-mono">
              imgi_33_11002919-premium-beyaz-ci-kolatali-surup-700ml.jpg
            </p>
          </div>
        </div>
      </div>

      {/* ── AŞAMA 1: Seçim ── */}
      {asama === 'secim' && (
        <>
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-12 text-center transition hover:border-violet-400 hover:bg-violet-100 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <FiUploadCloud size={48} className="text-violet-400" />
            <div>
              <p className="text-lg font-semibold text-slate-700">Dosyaları buraya sürükle</p>
              <p className="text-sm text-slate-500">veya tıklayarak seç — imgi_* formatında JPG/PNG/WEBP</p>
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

          {dosyalar.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {dosyalar.length} dosya tanındı
                  {gecersizDosyalar.length > 0 && (
                    <span className="ml-2 text-amber-600">· {gecersizDosyalar.length} imgi_* formatında değil (atlanacak)</span>
                  )}
                </p>
                <button type="button" onClick={handleSifirla} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600">
                  <FiTrash2 size={12} /> Temizle
                </button>
              </div>

              {gecersizDosyalar.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-semibold mb-1">Kabul edilmeyen dosyalar:</p>
                  {gecersizDosyalar.slice(0, 8).map(f => <p key={f} className="font-mono">• {f}</p>)}
                  {gecersizDosyalar.length > 8 && <p className="text-amber-600">...ve {gecersizDosyalar.length - 8} tane daha</p>}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
                {dosyalar.slice(0, 50).map((d, i) => (
                  <div key={i} className="px-3 py-1.5 font-mono text-slate-700 truncate">{d.file.name}</div>
                ))}
                {dosyalar.length > 50 && <div className="px-3 py-2 text-slate-400 text-center">...ve {dosyalar.length - 50} dosya daha</div>}
              </div>

              <button
                type="button"
                onClick={handleOnizleme}
                disabled={sorgulanıyor}
                className="w-full rounded-lg bg-violet-700 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sorgulanıyor ? <FiLoader className="animate-spin" /> : null}
                {sorgulanıyor ? 'Ürünler eşleştiriliyor...' : `${dosyalar.length} dosyayı eşleştir`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── AŞAMA 2: Onizleme & Onay ── */}
      {asama === 'onizleme' && (
        <div className="space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-xl border border-violet-200 bg-violet-50 py-3">
              <p className="text-2xl font-bold text-violet-700">{eslenenDosyalar.length}</p>
              <p className="text-xs text-violet-600 mt-0.5">Eşleşme Bulundu</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-3">
              <p className="text-2xl font-bold text-emerald-700">{onaylananSayisi}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Onaylandı</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 py-3">
              <p className="text-2xl font-bold text-slate-700">{eslenmeyenDosyalar.length + gecersizDosyalar.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Eşleşme Yok</p>
            </div>
          </div>

          {/* Bulk action butonları */}
          {eslenenDosyalar.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={tumunuSec} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Tümünü Seç
              </button>
              <button type="button" onClick={tumunuKaldir} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Seçimi Kaldır
              </button>
              <button type="button" onClick={yuksekGuvenSec} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                ≥%50 Güvenilenleri Seç
              </button>
            </div>
          )}

          {/* Eşleşen dosyalar — per-row onay listesi */}
          {eslenenDosyalar.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Eşleşmeler — tıklayarak onayla / kaldır
              </p>
              <div className="max-h-[480px] overflow-y-auto space-y-2 pr-0.5">
                {eslenenDosyalar.map((d, i) => {
                  const eslesen = d.eslesme!.eslesen!;
                  const puan = d.eslesme!.puan;
                  const isChecked = onaylananlar.has(d.file.name);
                  const tip = isChecked ? tipMap.get(d.file.name) : undefined;

                  const puanRenk =
                    puan >= 0.75 ? 'bg-emerald-100 text-emerald-700' :
                    puan >= 0.5  ? 'bg-yellow-100 text-yellow-700' :
                    puan >= 0.25 ? 'bg-orange-100 text-orange-700' :
                                   'bg-red-100 text-red-700';

                  return (
                    <div
                      key={i}
                      onClick={() => toggleOnay(d.file.name)}
                      className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-violet-300 bg-violet-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked ? 'border-violet-600 bg-violet-600' : 'border-slate-300'
                        }`}>
                          {isChecked && <FiCheck size={11} className="text-white" />}
                        </div>
                      </div>

                      {/* İçerik */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Dosya adı — tam görünüm */}
                        <p className="text-xs font-mono text-slate-600 break-all leading-relaxed">
                          {d.file.name}
                        </p>
                        {/* Eşleşen ürün */}
                        <p className="text-sm">
                          <span className="font-mono font-bold text-slate-900 mr-1.5">{eslesen.stok_kodu}</span>
                          <span className="text-slate-700">{eslesen.urun_adi}</span>
                        </p>
                      </div>

                      {/* Sağ badges */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${puanRenk}`}>
                          %{Math.round(puan * 100)}
                        </span>
                        {isChecked && tip && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            tip === 'Ana' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {tip}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eşleşme bulunamayan dosyalar */}
          {(eslenmeyenDosyalar.length > 0 || gecersizDosyalar.length > 0) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold mb-2 text-slate-700">
                Eşleşme bulunamayan dosyalar — yüklenmeyecek ({eslenmeyenDosyalar.length + gecersizDosyalar.length}):
              </p>
              <p className="text-slate-500 mb-2 text-[11px]">
                Bu dosyalar için hiçbir ürün adında ortak kelime tespit edilemedi.
                Dosya adındaki açıklama veritabanındaki ürün adlarıyla uyuşmuyor olabilir.
              </p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {eslenmeyenDosyalar.map(d => (
                  <p key={d.file.name} className="font-mono text-slate-600">• {d.file.name}</p>
                ))}
                {gecersizDosyalar.map(f => (
                  <p key={f} className="font-mono text-amber-600">• {f} <span className="text-amber-500">(imgi_* formatında değil)</span></p>
                ))}
              </div>
            </div>
          )}

          {/* Eylem butonları */}
          <div className="flex gap-3 pt-1">
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
              disabled={onaylananSayisi === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-700 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              <FiUploadCloud size={16} />
              {onaylananSayisi} dosyayı yükle
            </button>
          </div>
        </div>
      )}

      {/* ── AŞAMA 3: Yükleniyor ── */}
      {asama === 'yukleniyor' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <FiLoader size={36} className="animate-spin text-violet-600 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-800">Yükleniyor...</p>
            <p className="text-sm text-slate-500 mt-1">{yuklenenSayac} / {toplamYuklenecek} dosya işlendi</p>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: toplamYuklenecek > 0 ? `${(yuklenenSayac / toplamYuklenecek) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
            {dosyalar.filter(d => d.eslesme?.eslesen && onaylananlar.has(d.file.name)).map((d, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2">
                {d.durum === 'bekliyor' && <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-200 shrink-0" />}
                {d.durum === 'yukleniyor' && <FiLoader size={14} className="mt-0.5 animate-spin text-violet-500 shrink-0" />}
                {d.durum === 'tamamlandi' && <FiCheckCircle size={14} className="mt-0.5 text-emerald-500 shrink-0" />}
                {d.durum === 'hata' && <FiXCircle size={14} className="mt-0.5 text-red-500 shrink-0" />}
                <span className="font-mono text-slate-700 flex-1 break-all">{d.file.name}</span>
                {d.durum === 'hata' && <span className="text-red-600 text-[10px] shrink-0">{d.hataDetay}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AŞAMA 4: Sonuç ── */}
      {asama === 'sonuc' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 text-center">
            <FiCheckCircle size={48} className="text-violet-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-violet-800">Yükleme Tamamlandı!</p>
            <p className="text-sm text-violet-700 mt-2">
              {tamamlananSayisi} görsel başarıyla yüklendi ve ürünlere bağlandı.
            </p>
            {hataliSayisi > 0 && <p className="text-sm text-red-600 mt-1">{hataliSayisi} dosyada hata oluştu.</p>}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-3">
              <p className="text-2xl font-bold text-emerald-700">{tamamlananSayisi}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Başarılı</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 py-3">
              <p className="text-2xl font-bold text-red-700">{hataliSayisi}</p>
              <p className="text-xs text-red-600 mt-0.5">Hatalı</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 py-3">
              <p className="text-2xl font-bold text-slate-700">{eslenmeyenDosyalar.length}</p>
              <p className="text-xs text-slate-600 mt-0.5">Eşleşmedi</p>
            </div>
          </div>

          {hataliSayisi > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold mb-2">Hatalı Dosyalar:</p>
              {dosyalar.filter(d => d.durum === 'hata').map(d => (
                <p key={d.file.name} className="font-mono">• {d.file.name} — {d.hataDetay}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleSifirla}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FiRefreshCw size={14} /> Yeniden Başla
          </button>
        </div>
      )}
    </div>
  );
}