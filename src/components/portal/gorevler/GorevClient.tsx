'use client';

import { useState } from 'react';
import {
  FiPlus, FiCheck, FiRotateCcw, FiTrash2,
  FiCalendar, FiAlertCircle, FiInbox, FiUser, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { Locale } from '@/i18n-config';

type Gorev = {
  id: string;
  baslik: string;
  aciklama?: string | null;
  son_tarih?: string | null;
  tamamlandi: boolean;
  oncelik?: string | null;
  durum?: string | null;
  ilgili_firma_id?: string | null;
};

interface GorevClientProps {
  locale: Locale;
  atananGorevler: Gorev[];
  benimsGorevler: Gorev[];
  onAddTask: (fd: FormData) => Promise<void>;
  onToggleTask: (fd: FormData) => Promise<void>;
  onDeleteTask: (fd: FormData) => Promise<void>;
}

const ONCELIK_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  'Yüksek': { label: 'Yüksek', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  'Orta': { label: 'Orta', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  'Düşük': { label: 'Düşük', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
};

const DURUM_CONFIG: Record<string, { label: string; bg: string }> = {
  'Yapılacak': { label: 'Yapılacak', bg: 'bg-gray-100 text-gray-600' },
  'Devam Ediyor': { label: 'Devam Ediyor', bg: 'bg-blue-100 text-blue-700' },
  'Tamamlandı': { label: 'Tamamlandı', bg: 'bg-green-100 text-green-700' },
};

function isGecmis(tarih: string | null | undefined): boolean {
  if (!tarih) return false;
  return new Date(tarih) < new Date(new Date().toDateString());
}

function formatTarih(tarih: string | null | undefined, locale: string): string {
  if (!tarih) return '—';
  return new Date(tarih).toLocaleDateString(locale === 'de' ? 'de-DE' : 'tr-TR');
}

function GorevKarti({
  gorev,
  mod,
  onToggleTask,
  onDeleteTask,
}: {
  gorev: Gorev;
  mod: 'atanan' | 'benim';
  onToggleTask: (fd: FormData) => Promise<void>;
  onDeleteTask: (fd: FormData) => Promise<void>;
}) {
  const [aciklamaAcik, setAciklamaAcik] = useState(false);
  const gecmis = !gorev.tamamlandi && isGecmis(gorev.son_tarih);
  const oncelikCfg = gorev.oncelik ? ONCELIK_CONFIG[gorev.oncelik] : null;
  const durumCfg = gorev.durum ? DURUM_CONFIG[gorev.durum] : null;

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      gorev.tamamlandi
        ? 'border-gray-100 opacity-60'
        : gecmis
        ? 'border-red-200 shadow-sm'
        : 'border-gray-200 shadow-sm hover:shadow-md'
    }`}>
      <div className="p-4 flex items-start gap-3">
        {/* Tamamla toggle */}
        <form action={onToggleTask} className="mt-0.5 flex-shrink-0">
          <input type="hidden" name="id" value={gorev.id} />
          <input type="hidden" name="tamamlandi" value={String(gorev.tamamlandi)} />
          <button
            type="submit"
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              gorev.tamamlandi
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {gorev.tamamlandi && <FiCheck size={12} />}
          </button>
        </form>

        {/* İçerik */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold text-sm ${gorev.tamamlandi ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {gorev.baslik}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {oncelikCfg && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${oncelikCfg.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${oncelikCfg.dot}`} />
                  {oncelikCfg.label}
                </span>
              )}
              {durumCfg && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${durumCfg.bg}`}>
                  {durumCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Alt bilgi satırı */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {gorev.son_tarih && (
              <span className={`flex items-center gap-1 text-xs ${gecmis ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                <FiCalendar size={11} />
                {formatTarih(gorev.son_tarih, 'tr')}
                {gecmis && ' — Gecikmiş!'}
              </span>
            )}
            {gorev.aciklama && (
              <button
                onClick={() => setAciklamaAcik(p => !p)}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
              >
                {aciklamaAcik ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                Detay
              </button>
            )}
          </div>

          {/* Açıklama */}
          {aciklamaAcik && gorev.aciklama && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap border border-gray-100">
              {gorev.aciklama}
            </div>
          )}
        </div>

        {/* Sil (sadece kendi görevlerinde) */}
        {mod === 'benim' && (
          <form action={onDeleteTask} className="flex-shrink-0">
            <input type="hidden" name="id" value={gorev.id} />
            <button
              type="submit"
              className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
              title="Görevi sil"
            >
              <FiTrash2 size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function GorevClient({
  locale,
  atananGorevler,
  benimsGorevler,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: GorevClientProps) {
  const [aktifTab, setAktifTab] = useState<'atanan' | 'benim'>('atanan');
  const [filtre, setFiltre] = useState<'hepsi' | 'acik' | 'tamamlandi'>('acik');

  const aktifGorevler = aktifTab === 'atanan' ? atananGorevler : benimsGorevler;

  const filtrelenmisGorevler = aktifGorevler.filter(g => {
    if (filtre === 'acik') return !g.tamamlandi;
    if (filtre === 'tamamlandi') return g.tamamlandi;
    return true;
  });

  const acikSayisi = (list: Gorev[]) => list.filter(g => !g.tamamlandi).length;
  const gecmisSayisi = (list: Gorev[]) =>
    list.filter(g => !g.tamamlandi && isGecmis(g.son_tarih)).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Başlık */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">Görevlerim</h1>
        <p className="text-sm text-gray-500 mt-1">
          {acikSayisi(atananGorevler) + acikSayisi(benimsGorevler)} açık görev
          {gecmisSayisi(atananGorevler) + gecmisSayisi(benimsGorevler) > 0 && (
            <span className="ml-2 text-red-500 font-semibold">
              · {gecmisSayisi(atananGorevler) + gecmisSayisi(benimsGorevler)} gecikmiş
            </span>
          )}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200">
        {([
          { key: 'atanan', label: 'Bana Atanan', icon: <FiInbox size={14} />, list: atananGorevler },
          { key: 'benim', label: 'Oluşturduklarım', icon: <FiUser size={14} />, list: benimsGorevler },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              aktifTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {acikSayisi(tab.list) > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                aktifTab === tab.key ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {acikSayisi(tab.list)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Yeni Görev Formu — sadece "Oluşturduklarım" tabında */}
      {aktifTab === 'benim' && (
        <form action={onAddTask} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <FiPlus size={15} className="text-accent" />
            Yeni Görev Ekle
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              name="baslik"
              placeholder="Görev başlığı"
              required
              className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <input
              type="date"
              name="son_tarih"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <select
              name="oncelik"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="Orta">Öncelik: Orta</option>
              <option value="Yüksek">Öncelik: Yüksek</option>
              <option value="Düşük">Öncelik: Düşük</option>
            </select>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent/90 transition-colors"
              >
                <FiPlus size={15} />
                Ekle
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtre butonları */}
      <div className="flex gap-2">
        {([
          { key: 'acik', label: 'Açık' },
          { key: 'tamamlandi', label: 'Tamamlananlar' },
          { key: 'hepsi', label: 'Hepsi' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtre === f.key
                ? 'bg-accent text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Görev listesi */}
      <div className="space-y-3">
        {filtrelenmisGorevler.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiCheck size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {filtre === 'acik' ? 'Açık görev yok.' : 'Görev bulunamadı.'}
            </p>
          </div>
        ) : (
          filtrelenmisGorevler.map(gorev => (
            <GorevKarti
              key={gorev.id}
              gorev={gorev}
              mod={aktifTab}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
