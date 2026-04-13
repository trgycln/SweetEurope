// src/app/admin/urun-yonetimi/kategoriler/kategori-yonetim-istemcisi.tsx
'use client';

// @ts-nocheck - JSON type casting için geçici

import { useState, useTransition, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import {
  FiPlusCircle, FiEdit, FiTrash2, FiLoader, FiX, FiSave,
  FiChevronDown, FiChevronRight, FiZap, FiLayers, FiList,
} from 'react-icons/fi';
import { createKategoriAction, updateKategoriAction, deleteKategoriAction } from './actions';
import { createSablonAction, updateSablonAction, deleteSablonAction, createBatchSablonlarAction } from '../../ayarlar/sablonlar/actions';
import { toast } from 'sonner';

// Tipler
type Kategori = Tables<'kategoriler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface KategoriYonetimIstemcisiProps {
  serverKategoriler: Kategori[];
  serverSablonlar: Sablon[];
  locale: string;
}

// Sabitler
const DILLER = [
  { kod: 'tr', ad: 'Türkçe' }, { kod: 'de', ad: 'Almanca' },
  { kod: 'en', ad: 'İngilizce' }, { kod: 'ar', ad: 'Arapça' },
];

const URUN_GAMLARI = [
  { value: '', label: '— Seçiniz —' },
  { value: 'frozen-desserts', label: 'Frozen Desserts / Donuk Tatlılar' },
  { value: 'barista-bakery-essentials', label: 'Barista & Bakery Essentials / FO' },
];

const OZELLIK_PRESETLERI = [
  {
    id: 'temel', label: 'Temel Ürün', icon: '📦',
    items: [
      { alan_adi: 'gramaj', gosterim_adi: { tr: 'Gramaj', de: 'Gewicht', en: 'Weight', ar: 'الوزن' }, alan_tipi: 'metin', sira: 10 },
      { alan_adi: 'porsiyon', gosterim_adi: { tr: 'Porsiyon', de: 'Portion', en: 'Serving', ar: 'الحصة' }, alan_tipi: 'metin', sira: 20 },
      { alan_adi: 'kalori', gosterim_adi: { tr: 'Kalori', de: 'Kalorien', en: 'Calories', ar: 'السعرات' }, alan_tipi: 'sayı', sira: 30 },
    ],
  },
  {
    id: 'depolama', label: 'Depolama & Raf', icon: '🧊',
    items: [
      { alan_adi: 'raf_omru', gosterim_adi: { tr: 'Raf Ömrü', de: 'Haltbarkeit', en: 'Shelf Life', ar: 'مدة الصلاحية' }, alan_tipi: 'metin', sira: 40 },
      { alan_adi: 'saklama_kosullari', gosterim_adi: { tr: 'Saklama Koşulları', de: 'Lagerbedingungen', en: 'Storage Conditions', ar: 'شروط التخزين' }, alan_tipi: 'metin', sira: 50 },
    ],
  },
  {
    id: 'allerjenler', label: 'Allerjenler & Diyet', icon: '⚠️',
    items: [
      { alan_adi: 'allerjenler', gosterim_adi: { tr: 'Allerjenler', de: 'Allergene', en: 'Allergens', ar: 'مسببات الحساسية' }, alan_tipi: 'metin', sira: 60 },
      { alan_adi: 'glutensiz', gosterim_adi: { tr: 'Glutensiz', de: 'Glutenfrei', en: 'Gluten Free', ar: 'خالي من الغلوتين' }, alan_tipi: 'metin', sira: 70 },
      { alan_adi: 'vegan', gosterim_adi: { tr: 'Vegan', de: 'Vegan', en: 'Vegan', ar: 'نباتي' }, alan_tipi: 'metin', sira: 80 },
    ],
  },
  {
    id: 'barista', label: 'Barista / Kahve', icon: '☕',
    items: [
      { alan_adi: 'tat_profili', gosterim_adi: { tr: 'Tat Profili', de: 'Geschmacksprofil', en: 'Taste Profile', ar: 'ملف الطعم' }, alan_tipi: 'metin', sira: 10 },
      { alan_adi: 'kavurma_derecesi', gosterim_adi: { tr: 'Kavurma Derecesi', de: 'Röstgrad', en: 'Roast Level', ar: 'درجة التحميص' }, alan_tipi: 'metin', sira: 20 },
      { alan_adi: 'koken', gosterim_adi: { tr: 'Köken', de: 'Herkunft', en: 'Origin', ar: 'المنشأ' }, alan_tipi: 'metin', sira: 30 },
    ],
  },
  {
    id: 'pastane', label: 'Pastane / Pasta', icon: '🎂',
    items: [
      { alan_adi: 'dilim_adet', gosterim_adi: { tr: 'Dilim/Adet', de: 'Stück/Scheiben', en: 'Slices/Pieces', ar: 'شرائح/قطع' }, alan_tipi: 'metin', sira: 10 },
      { alan_adi: 'cap', gosterim_adi: { tr: 'Çap', de: 'Durchmesser', en: 'Diameter', ar: 'القطر' }, alan_tipi: 'metin', sira: 20 },
      { alan_adi: 'boy', gosterim_adi: { tr: 'Boy', de: 'Länge', en: 'Length', ar: 'الطول' }, alan_tipi: 'metin', sira: 30 },
    ],
  },
];

// ─── KATEGORİ MODAL ────────────────────────────────────────────────────────────
function KategoriModal({ isOpen, onClose, mevcutKategori, tumKategoriler }: {
  isOpen: boolean; onClose: () => void;
  mevcutKategori?: Kategori | null; tumKategoriler: Kategori[];
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!mevcutKategori;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      const action = isEdit ? updateKategoriAction.bind(null, mevcutKategori.id) : createKategoriAction;
      toast.promise(action(formData), {
        loading: isEdit ? 'Güncelleniyor...' : 'Oluşturuluyor...',
        success: (r) => { if (r.success) { onClose(); return r.message; } throw new Error(r.message); },
        error: (err) => err.message,
      });
    });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-5 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">{isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori Oluştur'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><FiX size={18} /></button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Üst Kategori <span className="font-normal text-gray-400">(opsiyonel)</span></label>
              <select name="ust_kategori_id" defaultValue={mevcutKategori?.ust_kategori_id || ''} className="w-full p-2 border rounded-md bg-gray-50 text-sm">
                <option value="">Ana Kategori (üst seviye)</option>
                {tumKategoriler
                  .filter(k => k.id !== mevcutKategori?.id && !k.ust_kategori_id)
                  .map(k => <option key={k.id} value={k.id}>{k.ad?.tr || k.ad?.de || 'İsimsiz'}</option>)
                }
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Slug</label>
                <input name="slug" defaultValue={mevcutKategori?.slug || ''} className="w-full p-2 border rounded-md font-mono text-sm" placeholder="ornek-slug" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Ürün Gamı</label>
                <select name="urun_gami" defaultValue={mevcutKategori?.urun_gami || ''} className="w-full p-2 border rounded-md bg-gray-50 text-sm">
                  {URUN_GAMLARI.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Kategori Adı — Çok Dilli</p>
              <div className="space-y-2">
                {DILLER.map(d => (
                  <div key={d.kod} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16 shrink-0 text-right">{d.ad}</span>
                    <input
                      name={`ad_${d.kod}`}
                      defaultValue={mevcutKategori?.ad?.[d.kod] || ''}
                      className="flex-1 p-2 border rounded-md text-sm"
                      required={d.kod === 'tr'}
                      placeholder={d.kod === 'tr' ? 'Zorunlu' : 'Opsiyonel'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end gap-2 rounded-b-xl border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-bold">İptal</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold disabled:opacity-50">
              {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              {isEdit ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ÖZELLİK (ŞABLON) MODAL ───────────────────────────────────────────────────
function SablonModal({ isOpen, onClose, mevcutSablon, kategoriId, onSuccess }: {
  isOpen: boolean; onClose: () => void;
  mevcutSablon?: Sablon | null; kategoriId: string; onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!mevcutSablon;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => {
      const action = isEdit ? updateSablonAction.bind(null, mevcutSablon.id) : createSablonAction;
      toast.promise(action(fd), {
        loading: isEdit ? 'Güncelleniyor...' : 'Ekleniyor...',
        success: (r) => { if (r.success) { onSuccess(); onClose(); return r.message; } throw new Error(r.message); },
        error: (err) => err.message,
      });
    });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-5 border-b flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">{isEdit ? 'Özelliği Düzenle' : 'Yeni Özellik Ekle'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><FiX size={18} /></button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <input type="hidden" name="kategori_id" value={kategoriId} />
            <div className="border rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Gösterim Adı — Çok Dilli</p>
              <div className="grid grid-cols-2 gap-2">
                {DILLER.map(d => (
                  <div key={d.kod}>
                    <label className="text-xs text-gray-400">{d.ad}</label>
                    <input
                      name={`gosterim_adi_${d.kod}`}
                      defaultValue={mevcutSablon?.gosterim_adi?.[d.kod] || ''}
                      className="w-full p-2 text-sm border rounded-md mt-0.5"
                      required={d.kod === 'tr'}
                      placeholder={d.kod === 'tr' ? 'Zorunlu' : 'Opsiyonel'}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600">Veritabanı Alan Adı</label>
                <input name="alan_adi" defaultValue={mevcutSablon?.alan_adi || ''} className="w-full p-2 border rounded-md font-mono text-sm mt-1" placeholder="or. gramaj" pattern="^[a-z0-9_]+$" title="Sadece küçük harf, rakam ve _ kullanın" required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600">Sıra No</label>
                <input type="number" name="sira" defaultValue={mevcutSablon?.sira ?? 0} className="w-full p-2 border rounded-md text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Alan Tipi</label>
              <select name="alan_tipi" defaultValue={mevcutSablon?.alan_tipi || 'metin'} className="w-full p-2 border rounded-md text-sm bg-gray-50 mt-1">
                <option value="metin">Metin (string)</option>
                <option value="sayı">Sayı (number)</option>
              </select>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Portal Görünürlüğü</p>
              {[
                { name: 'public_gorunur', label: '🌐 Public Portal' },
                { name: 'musteri_gorunur', label: '👤 Müşteri Portali' },
                { name: 'alt_bayi_gorunur', label: '🏪 Alt Bayi Portali' },
              ].map(v => (
                <label key={v.name} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" name={v.name} defaultChecked={mevcutSablon?.[v.name] ?? false} className="rounded border-gray-300 text-accent h-4 w-4" />
                  {v.label}
                </label>
              ))}
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end gap-2 rounded-b-xl border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-bold">İptal</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold disabled:opacity-50">
              {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              {isEdit ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ANA BİLEŞEN ──────────────────────────────────────────────────────────────
export function KategoriYonetimIstemcisi({ serverKategoriler, serverSablonlar, locale }: KategoriYonetimIstemcisiProps) {
  const router = useRouter();
  const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [kategoriModal, setKategoriModal] = useState<{ open: boolean; editing: Kategori | null }>({ open: false, editing: null });
  const [sablonModal, setSablonModal] = useState<{ open: boolean; editing: Sablon | null }>({ open: false, editing: null });
  const [showPresets, setShowPresets] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sablonlarByKategori = useMemo(() => {
    const map = new Map<string, Sablon[]>();
    for (const s of serverSablonlar) {
      if (!map.has(s.kategori_id)) map.set(s.kategori_id, []);
      map.get(s.kategori_id)!.push(s);
    }
    return map;
  }, [serverSablonlar]);

  const seciliKategori = serverKategoriler.find(k => k.id === seciliKategoriId) || null;
  const ustKategori = seciliKategori?.ust_kategori_id
    ? serverKategoriler.find(k => k.id === seciliKategori.ust_kategori_id)
    : null;

  const { kendi, miras } = useMemo(() => {
    if (!seciliKategoriId) return { kendi: [], miras: [] };
    const kendi = (sablonlarByKategori.get(seciliKategoriId) || []).slice().sort((a, b) => (a.sira || 0) - (b.sira || 0));
    const miras = ustKategori
      ? (sablonlarByKategori.get(ustKategori.id) || []).slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))
      : [];
    return { kendi, miras };
  }, [seciliKategoriId, sablonlarByKategori, ustKategori]);

  const getKategoriAdi = (k: Kategori) => {
    const ad = k.ad as Record<string, string>;
    return ad?.[locale] || ad?.tr || ad?.de || 'İsimsiz';
  };

  const ustKategoriler = serverKategoriler.filter(k => !k.ust_kategori_id);

  const handleSelectKategori = (k: Kategori) => {
    setSeciliKategoriId(k.id);
    if (k.ust_kategori_id) setExpandedIds(prev => new Set([...prev, k.ust_kategori_id!]));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteKategori = (k: Kategori) => {
    toast.warning(`"${getKategoriAdi(k)}" kategorisini silmek istediğinizden emin misiniz?`, {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Evet, Sil',
        onClick: () => {
          toast.promise(deleteKategoriAction(k.id), {
            loading: 'Siliniyor...',
            success: (r) => {
              if (r.success) { if (seciliKategoriId === k.id) setSeciliKategoriId(null); return r.message; }
              throw new Error(r.message);
            },
            error: (e) => e.message,
          });
        },
      },
      cancel: { label: 'İptal', onClick: () => {} },
    });
  };

  const handleDeleteSablon = (s: Sablon) => {
    const ad = (s.gosterim_adi as Record<string, string>)?.tr || s.alan_adi;
    toast.warning(`"${ad}" özelliğini silmek istediğinizden emin misiniz?`, {
      description: 'Bu işlem geri alınamaz.',
      action: {
        label: 'Evet, Sil',
        onClick: () => {
          toast.promise(deleteSablonAction(s.id), {
            loading: 'Siliniyor...',
            success: (r) => { if (r.success) { router.refresh(); return r.message; } throw new Error(r.message); },
            error: (e) => e.message,
          });
        },
      },
      cancel: { label: 'İptal', onClick: () => {} },
    });
  };

  const handlePresetEkle = (preset: typeof OZELLIK_PRESETLERI[0]) => {
    if (!seciliKategoriId) return;
    setShowPresets(false);
    startTransition(() => {
      toast.promise(createBatchSablonlarAction(seciliKategoriId, preset.items), {
        loading: preset.label + ' özellikleri ekleniyor...',
        success: (r) => { if (r.success) { router.refresh(); return r.message; } throw new Error(r.message); },
        error: (e) => e.message,
      });
    });
  };

  return (
    <>
      <KategoriModal
        isOpen={kategoriModal.open}
        onClose={() => setKategoriModal({ open: false, editing: null })}
        mevcutKategori={kategoriModal.editing}
        tumKategoriler={serverKategoriler}
      />
      <SablonModal
        isOpen={sablonModal.open}
        onClose={() => setSablonModal({ open: false, editing: null })}
        mevcutSablon={sablonModal.editing}
        kategoriId={seciliKategoriId || ''}
        onSuccess={() => router.refresh()}
      />

      <div className="flex gap-6 items-start">
        {/* ── SOL PANEL ──────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 sticky top-24">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                <FiLayers size={15} className="text-accent" /> Kategoriler
              </h2>
              <button
                onClick={() => setKategoriModal({ open: true, editing: null })}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-accent text-white rounded-lg font-bold hover:bg-opacity-90"
              >
                <FiPlusCircle size={12} /> Yeni
              </button>
            </div>
            <div className="p-2 space-y-0.5 max-h-[calc(100vh-220px)] overflow-y-auto">
              {ustKategoriler.length === 0 && (
                <p className="text-center text-gray-400 text-xs py-6">Henüz kategori yok</p>
              )}
              {ustKategoriler.map(ust => {
                const altlar = serverKategoriler.filter(k => k.ust_kategori_id === ust.id);
                const isExpanded = expandedIds.has(ust.id);
                const isSelected = seciliKategoriId === ust.id;
                return (
                  <div key={ust.id}>
                    <div className={'group flex items-center rounded-lg transition-colors ' + (isSelected ? 'bg-accent/10' : 'hover:bg-gray-100')}>
                      <button
                        onClick={() => altlar.length ? handleToggleExpand(ust.id) : undefined}
                        className={'p-1.5 text-gray-400 ' + (altlar.length ? 'hover:text-gray-600 cursor-pointer' : 'invisible')}
                      >
                        {isExpanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                      </button>
                      <button
                        onClick={() => handleSelectKategori(ust)}
                        className={'flex-1 text-left py-2 pr-1 text-sm font-semibold truncate ' + (isSelected ? 'text-accent' : 'text-gray-700')}
                      >
                        {getKategoriAdi(ust)}
                        {altlar.length > 0 && <span className="ml-1 text-[10px] text-gray-400">({altlar.length})</span>}
                      </button>
                      <div className="flex gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setKategoriModal({ open: true, editing: ust })} className="p-1 text-gray-400 hover:text-blue-600 rounded"><FiEdit size={11} /></button>
                        <button onClick={() => handleDeleteKategori(ust)} className="p-1 text-gray-400 hover:text-red-600 rounded"><FiTrash2 size={11} /></button>
                      </div>
                    </div>
                    {isExpanded && altlar.length > 0 && (
                      <div className="ml-6 space-y-0.5 mb-0.5">
                        {altlar.map(alt => {
                          const isAltSelected = seciliKategoriId === alt.id;
                          return (
                            <div key={alt.id} className={'group flex items-center rounded-lg transition-colors ' + (isAltSelected ? 'bg-accent/10' : 'hover:bg-gray-100')}>
                              <button
                                onClick={() => handleSelectKategori(alt)}
                                className={'flex-1 text-left py-1.5 px-2 text-xs font-medium truncate ' + (isAltSelected ? 'text-accent' : 'text-gray-600')}
                              >
                                └ {getKategoriAdi(alt)}
                              </button>
                              <div className="flex gap-0.5 pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => setKategoriModal({ open: true, editing: alt })} className="p-1 text-gray-400 hover:text-blue-600 rounded"><FiEdit size={11} /></button>
                                <button onClick={() => handleDeleteKategori(alt)} className="p-1 text-gray-400 hover:text-red-600 rounded"><FiTrash2 size={11} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SAĞ PANEL ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!seciliKategori ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
              <FiLayers size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">Sol panelden bir kategori seçin</p>
              <p className="text-gray-400 text-sm mt-1">Kategori bilgileri ve özellik şablonları burada görünecek.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Kategori Bilgileri */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    {ustKategori && (
                      <p className="text-xs text-gray-400 mb-0.5">{getKategoriAdi(ustKategori)} /</p>
                    )}
                    <h2 className="font-bold text-gray-800 text-lg leading-tight">{getKategoriAdi(seciliKategori)}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setKategoriModal({ open: true, editing: seciliKategori })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
                    >
                      <FiEdit size={14} /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteKategori(seciliKategori)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 font-medium"
                    >
                      <FiTrash2 size={14} /> Sil
                    </button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {DILLER.map(d => (
                    <div key={d.kod}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.ad}</p>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {((seciliKategori.ad as Record<string,string>)?.[d.kod]) || <span className="text-gray-300">—</span>}
                      </p>
                    </div>
                  ))}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Slug</p>
                    <p className="font-mono text-xs text-gray-600">{seciliKategori.slug || <span className="text-gray-300">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Ürün Gamı</p>
                    <p className="text-sm text-gray-600">
                      {seciliKategori.urun_gami === 'frozen-desserts' ? 'Frozen Desserts'
                        : seciliKategori.urun_gami === 'barista-bakery-essentials' ? 'Barista & Bakery'
                        : <span className="text-gray-300">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Üst Kategori</p>
                    <p className="text-sm text-gray-600">{ustKategori ? getKategoriAdi(ustKategori) : <span className="text-gray-400 italic text-xs">Ana kategori</span>}</p>
                  </div>
                </div>
              </div>

              {/* Özellik Şablonları */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                      <FiList size={15} className="text-accent" /> Özellik Şablonları
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {kendi.length} özellik{miras.length > 0 ? `, ${miras.length} üst kategoriden miras alınmış` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <button
                        onClick={() => setShowPresets(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
                      >
                        <FiZap size={13} className="text-amber-500" /> Hızlı Ekle
                        <FiChevronDown size={11} />
                      </button>
                      {showPresets && (
                        <>
                          <div className="fixed inset-0 z-[9]" onClick={() => setShowPresets(false)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-10 min-w-52 overflow-hidden">
                            <p className="px-3 pt-2 pb-1 text-[10px] text-gray-400 uppercase tracking-wide font-bold">Hazır Özellik Setleri</p>
                            {OZELLIK_PRESETLERI.map(p => (
                              <button
                                key={p.id}
                                onClick={() => handlePresetEkle(p)}
                                disabled={isPending}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-50 transition-colors"
                              >
                                <span className="text-base">{p.icon}</span>
                                <div>
                                  <p className="font-medium leading-tight">{p.label}</p>
                                  <p className="text-[10px] text-gray-400">{p.items.length} özellik ekler</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setSablonModal({ open: true, editing: null })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-lg font-bold hover:bg-opacity-90"
                    >
                      <FiPlusCircle size={13} /> Özel Ekle
                    </button>
                  </div>
                </div>

                <div className="divide-y">
                  {miras.map(s => {
                    const ad = (s.gosterim_adi as Record<string,string>)?.[locale] || (s.gosterim_adi as Record<string,string>)?.tr || s.alan_adi;
                    return (
                      <div key={s.id} className="px-4 py-3 bg-blue-50/60 flex items-center gap-3">
                        <div className="w-6 text-center text-[10px] text-gray-300 font-mono">{s.sira}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-600">{ad}</p>
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                              ← {ustKategori ? getKategoriAdi(ustKategori) : 'Üst Kategori'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            <code className="font-mono bg-blue-100/50 px-1 rounded text-blue-700">{s.alan_adi}</code>
                            <span className="mx-1.5">·</span>
                            <span>{s.alan_tipi}</span>
                          </p>
                        </div>
                        <div className="text-[10px] text-gray-400 italic shrink-0">Miras alınmış</div>
                      </div>
                    );
                  })}

                  {kendi.map(s => {
                    const ad = (s.gosterim_adi as Record<string,string>)?.[locale] || (s.gosterim_adi as Record<string,string>)?.tr || s.alan_adi;
                    return (
                      <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 group transition-colors">
                        <div className="w-6 text-center text-[10px] text-gray-300 font-mono shrink-0">{s.sira}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">{ad}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            <code className="font-mono bg-gray-100 px-1 rounded">{s.alan_adi}</code>
                            <span className="mx-1.5">·</span>
                            <span className={'px-1.5 py-0.5 rounded text-[10px] font-medium ' + (s.alan_tipi === 'sayı' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600')}>{s.alan_tipi}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-300 shrink-0">
                          {s.public_gorunur && <span title="Public Portal">🌐</span>}
                          {s.musteri_gorunur && <span title="Müşteri Portali">👤</span>}
                          {s.alt_bayi_gorunur && <span title="Alt Bayi Portali">🏪</span>}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setSablonModal({ open: true, editing: s })} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Düzenle"><FiEdit size={14} /></button>
                          <button onClick={() => handleDeleteSablon(s)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Sil"><FiTrash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}

                  {kendi.length === 0 && miras.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <FiList size={36} className="mx-auto mb-3 text-gray-200" />
                      <p className="font-medium text-sm">Henüz özellik şablonu tanımlanmamış</p>
                      <p className="text-xs mt-1">Hızlı Ekle ile hazır setleri, veya Özel Ekle ile tekil özellik ekleyebilirsiniz.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
