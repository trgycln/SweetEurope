'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  FiPlus, FiX, FiCheck, FiTrash2, FiCalendar,
  FiChevronRight, FiChevronLeft, FiMessageSquare,
  FiAlertCircle, FiEdit2, FiSave, FiFlag,
  FiCheckSquare, FiSquare, FiClock, FiArrowRight,
} from 'react-icons/fi';
import { toast } from 'sonner';

// ─── Tipler ───────────────────────────────────────────────
type AltGorev = {
  id: string;
  baslik: string;
  tamamlandi: boolean;
  olusturma_tarihi: string;
};

type GorevNotu = {
  id: string;
  not_metni: string;
  kullanici_id: string;
  olusturma_tarihi: string;
};

type Gorev = {
  id: string;
  baslik: string;
  aciklama?: string | null;
  son_tarih?: string | null;
  tamamlandi: boolean;
  oncelik?: string | null;
  durum?: string | null;
  sahip_id?: string | null;
  atanan_kisi_id?: string | null;
  alt_gorevler: AltGorev[];
  gorev_notlari: GorevNotu[];
};

interface KanbanBoardProps {
  locale: string;
  currentUserId: string;
  gorevler: Gorev[];
  onAddTask: (fd: FormData) => Promise<void>;
  onDeleteTask: (fd: FormData) => Promise<void>;
  onUpdateDurum: (gorevId: string, yeniDurum: string) => Promise<void>;
  onAddAltGorev: (gorevId: string, baslik: string) => Promise<void>;
  onToggleAltGorev: (altGorevId: string, tamamlandi: boolean) => Promise<void>;
  onDeleteAltGorev: (altGorevId: string) => Promise<void>;
  onAddNot: (gorevId: string, notMetni: string) => Promise<void>;
  onDeleteNot: (notId: string) => Promise<void>;
  onUpdateGorev: (gorevId: string, updates: {
    baslik?: string;
    son_tarih?: string | null;
    oncelik?: string;
    aciklama?: string;
  }) => Promise<void>;
}

// ─── Sabitler ─────────────────────────────────────────────
const KOLONLAR = [
  {
    durum: 'Yapılacak',
    label: 'Yapılacak',
    bg: 'bg-slate-50',
    header: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  {
    durum: 'Devam Ediyor',
    label: 'Devam Ediyor',
    bg: 'bg-blue-50',
    header: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    durum: 'Tamamlandı',
    label: 'Tamamlandı',
    bg: 'bg-green-50',
    header: 'bg-green-100 text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
] as const;

const ONCELIK_CFG: Record<string, { label: string; bg: string; text: string; border: string; dot: string; stripe: string }> = {
  'Yüksek': {
    label: 'Yüksek',
    bg: 'bg-red-50', text: 'text-red-700',
    border: 'border-red-200', dot: 'bg-red-500',
    stripe: 'bg-red-500',
  },
  'Orta': {
    label: 'Orta',
    bg: 'bg-amber-50', text: 'text-amber-700',
    border: 'border-amber-200', dot: 'bg-amber-400',
    stripe: 'bg-amber-400',
  },
  'Düşük': {
    label: 'Düşük',
    bg: 'bg-blue-50', text: 'text-blue-700',
    border: 'border-blue-200', dot: 'bg-blue-400',
    stripe: 'bg-slate-300',
  },
};

function isGecmis(tarih: string | null | undefined): boolean {
  if (!tarih) return false;
  return new Date(tarih) < new Date(new Date().toDateString());
}

function formatTarih(tarih: string | null | undefined): string {
  if (!tarih) return '';
  const d = new Date(tarih);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatZaman(tarih: string): string {
  const d = new Date(tarih);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Görev Detay Drawer ───────────────────────────────────
function GorevDetayDrawer({
  gorev,
  currentUserId,
  onClose,
  onUpdateDurum,
  onAddAltGorev,
  onToggleAltGorev,
  onDeleteAltGorev,
  onAddNot,
  onDeleteNot,
  onUpdateGorev,
  onDeleteTask,
}: {
  gorev: Gorev;
  currentUserId: string;
  onClose: () => void;
  onUpdateDurum: (gorevId: string, yeniDurum: string) => Promise<void>;
  onAddAltGorev: (gorevId: string, baslik: string) => Promise<void>;
  onToggleAltGorev: (altGorevId: string, tamamlandi: boolean) => Promise<void>;
  onDeleteAltGorev: (altGorevId: string) => Promise<void>;
  onAddNot: (gorevId: string, notMetni: string) => Promise<void>;
  onDeleteNot: (notId: string) => Promise<void>;
  onUpdateGorev: (gorevId: string, updates: any) => Promise<void>;
  onDeleteTask: (fd: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [yeniAltGorev, setYeniAltGorev] = useState('');
  const [yeniNot, setYeniNot] = useState('');
  const [duzenleBaslik, setDuzenleBaslik] = useState(false);
  const [baslik, setBaslik] = useState(gorev.baslik);
  const [aciklama, setAciklama] = useState(gorev.aciklama || '');
  const [sonTarih, setSonTarih] = useState(gorev.son_tarih?.slice(0, 10) || '');
  const [oncelik, setOncelik] = useState(gorev.oncelik || 'Orta');
  const [aktifTab, setAktifTab] = useState<'altgorevler' | 'notlar'>('altgorevler');
  const baslikRef = useRef<HTMLInputElement>(null);

  const tamamlananAlt = gorev.alt_gorevler.filter(a => a.tamamlandi).length;
  const toplamAlt = gorev.alt_gorevler.length;
  const ilerleme = toplamAlt > 0 ? Math.round((tamamlananAlt / toplamAlt) * 100) : 0;
  const gecmis = isGecmis(gorev.son_tarih) && gorev.durum !== 'Tamamlandı';
  const oncelikCfg = ONCELIK_CFG[oncelik] || ONCELIK_CFG['Orta'];

  useEffect(() => {
    if (duzenleBaslik) baslikRef.current?.focus();
  }, [duzenleBaslik]);

  const handleKaydet = () => {
    startTransition(async () => {
      await onUpdateGorev(gorev.id, {
        baslik: baslik.trim() || gorev.baslik,
        aciklama: aciklama.trim(),
        son_tarih: sonTarih || null,
        oncelik,
      });
      setDuzenleBaslik(false);
      toast.success('Görev güncellendi.');
    });
  };

  const handleDurumDegistir = (yeniDurum: string) => {
    startTransition(async () => {
      await onUpdateDurum(gorev.id, yeniDurum);
      toast.success(`"${yeniDurum}" kolonuna taşındı.`);
    });
  };

  const handleAltGorevEkle = () => {
    if (!yeniAltGorev.trim()) return;
    startTransition(async () => {
      await onAddAltGorev(gorev.id, yeniAltGorev.trim());
      setYeniAltGorev('');
    });
  };

  const handleNotEkle = () => {
    if (!yeniNot.trim()) return;
    startTransition(async () => {
      await onAddNot(gorev.id, yeniNot.trim());
      setYeniNot('');
      toast.success('Not eklendi.');
    });
  };

  const handleSil = () => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;
    const fd = new FormData();
    fd.append('id', gorev.id);
    startTransition(async () => {
      await onDeleteTask(fd);
      onClose();
      toast.success('Görev silindi.');
    });
  };

  const kolonSirasi = KOLONLAR.map(k => k.durum);
  const mevcutIndex = kolonSirasi.indexOf((gorev.durum || 'Yapılacak') as any);
  const oncekiKolon = mevcutIndex > 0 ? kolonSirasi[mevcutIndex - 1] : null;
  const sonrakiKolon = mevcutIndex < kolonSirasi.length - 1 ? kolonSirasi[mevcutIndex + 1] : null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Öncelik şeridi */}
        <div className={`h-1.5 w-full ${oncelikCfg.stripe}`} />

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex-1 min-w-0 pr-3">
            {duzenleBaslik ? (
              <input
                ref={baslikRef}
                value={baslik}
                onChange={e => setBaslik(e.target.value)}
                className="w-full text-lg font-bold text-gray-800 border-b-2 border-accent outline-none pb-1"
                onKeyDown={e => e.key === 'Enter' && handleKaydet()}
              />
            ) : (
              <h2
                className="text-lg font-bold text-gray-800 cursor-pointer hover:text-accent transition-colors"
                onClick={() => setDuzenleBaslik(true)}
                title="Düzenlemek için tıkla"
              >
                {baslik}
              </h2>
            )}

            {/* Durum badge */}
            <div className="flex items-center gap-2 mt-1.5">
              {KOLONLAR.map(k => (
                <button
                  key={k.durum}
                  onClick={() => handleDurumDegistir(k.durum)}
                  disabled={isPending}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                    gorev.durum === k.durum
                      ? `${k.header} ring-2 ring-offset-1 ring-current`
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <FiX size={18} />
          </button>
        </div>

        {/* Meta bilgiler */}
        <div className="px-5 py-3 bg-gray-50 border-b grid grid-cols-2 gap-3">
          {/* Tarih */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Son Tarih
            </label>
            <input
              type="date"
              value={sonTarih}
              onChange={e => setSonTarih(e.target.value)}
              className={`text-sm font-semibold border rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-accent/30 focus:border-accent ${
                gecmis ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-200 text-gray-700'
              }`}
            />
            {gecmis && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                <FiAlertCircle size={10} /> Gecikmiş
              </p>
            )}
          </div>

          {/* Öncelik */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Öncelik
            </label>
            <select
              value={oncelik}
              onChange={e => setOncelik(e.target.value)}
              className="text-sm font-semibold border border-gray-200 rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="Yüksek">🔴 Yüksek</option>
              <option value="Orta">🟡 Orta</option>
              <option value="Düşük">🔵 Düşük</option>
            </select>
          </div>

          {/* İlerleme (alt görevler varsa) */}
          {toplamAlt > 0 && (
            <div className="col-span-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Alt Görevler</span>
                <span className="font-bold">{tamamlananAlt}/{toplamAlt} tamamlandı</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{ width: `${ilerleme}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Açıklama */}
        <div className="px-5 py-3 border-b">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Açıklama
          </label>
          <textarea
            value={aciklama}
            onChange={e => setAciklama(e.target.value)}
            placeholder="Açıklama ekle..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700"
          />
        </div>

        {/* Kaydet butonu */}
        <div className="px-5 py-2 border-b flex justify-end">
          <button
            onClick={handleKaydet}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <FiSave size={13} />
            Kaydet
          </button>
        </div>

        {/* Tab: Alt Görevler / Notlar */}
        <div className="flex border-b">
          {[
            { key: 'altgorevler', label: 'Alt Görevler', count: toplamAlt },
            { key: 'notlar', label: 'Notlar', count: gorev.gorev_notlari.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAktifTab(tab.key as any)}
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                aktifTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  aktifTab === tab.key ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {aktifTab === 'altgorevler' && (
            <>
              {/* Alt görev ekle */}
              <div className="flex gap-2">
                <input
                  value={yeniAltGorev}
                  onChange={e => setYeniAltGorev(e.target.value)}
                  placeholder="Alt görev ekle..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  onKeyDown={e => e.key === 'Enter' && handleAltGorevEkle()}
                />
                <button
                  onClick={handleAltGorevEkle}
                  disabled={isPending || !yeniAltGorev.trim()}
                  className="px-3 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  <FiPlus size={16} />
                </button>
              </div>

              {/* Alt görev listesi */}
              {gorev.alt_gorevler.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Henüz alt görev yok.
                </p>
              ) : (
                <div className="space-y-2">
                  {gorev.alt_gorevler.map(ag => (
                    <div
                      key={ag.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                    >
                      <button
                        onClick={() => startTransition(() => onToggleAltGorev(ag.id, ag.tamamlandi))}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          ag.tamamlandi
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {ag.tamamlandi && <FiCheck size={11} />}
                      </button>
                      <span className={`flex-1 text-sm ${ag.tamamlandi ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {ag.baslik}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatZaman(ag.olusturma_tarihi)}
                      </span>
                      <button
                        onClick={() => startTransition(() => onDeleteAltGorev(ag.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {aktifTab === 'notlar' && (
            <>
              {/* Not ekle */}
              <div className="space-y-2">
                <textarea
                  value={yeniNot}
                  onChange={e => setYeniNot(e.target.value)}
                  placeholder="Not yaz..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <button
                  onClick={handleNotEkle}
                  disabled={isPending || !yeniNot.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 transition-colors"
                >
                  <FiMessageSquare size={13} />
                  Not Ekle
                </button>
              </div>

              {/* Notlar */}
              {gorev.gorev_notlari.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Henüz not yok.
                </p>
              ) : (
                <div className="space-y-3 mt-2">
                  {gorev.gorev_notlari.map(not => (
                    <div key={not.id} className="bg-amber-50 border border-amber-100 rounded-lg p-3 group relative">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{not.not_metni}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <FiClock size={10} />
                          {formatZaman(not.olusturma_tarihi)}
                        </span>
                        {not.kullanici_id === currentUserId && (
                          <button
                            onClick={() => startTransition(() => onDeleteNot(not.id))}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between bg-gray-50">
          {/* Kolon geçişi */}
          <div className="flex gap-2">
            {oncekiKolon && (
              <button
                onClick={() => handleDurumDegistir(oncekiKolon)}
                disabled={isPending}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <FiChevronLeft size={13} />
                {oncekiKolon}
              </button>
            )}
            {sonrakiKolon && (
              <button
                onClick={() => handleDurumDegistir(sonrakiKolon)}
                disabled={isPending}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {sonrakiKolon}
                <FiChevronRight size={13} />
              </button>
            )}
          </div>

          {/* Sil */}
          <button
            onClick={handleSil}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiTrash2 size={13} />
            Sil
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Kanban Kartı ─────────────────────────────────────────
function GorevKarti({
  gorev,
  onClick,
}: {
  gorev: Gorev;
  onClick: () => void;
}) {
  const gecmis = isGecmis(gorev.son_tarih) && gorev.durum !== 'Tamamlandı';
  const oncelikCfg = gorev.oncelik ? ONCELIK_CFG[gorev.oncelik] : null;
  const tamamlananAlt = gorev.alt_gorevler.filter(a => a.tamamlandi).length;
  const toplamAlt = gorev.alt_gorevler.length;
  const ilerleme = toplamAlt > 0 ? Math.round((tamamlananAlt / toplamAlt) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
        gecmis ? 'border-red-200' : 'border-gray-200'
      } ${gorev.durum === 'Tamamlandı' ? 'opacity-70' : ''}`}
    >
      {/* Öncelik şeridi */}
      {oncelikCfg && (
        <div className={`h-1 w-full ${oncelikCfg.stripe}`} />
      )}

      <div className="p-3 space-y-2.5">
        {/* Başlık */}
        <p className={`text-sm font-semibold leading-snug ${
          gorev.durum === 'Tamamlandı' ? 'line-through text-gray-400' : 'text-gray-800'
        }`}>
          {gorev.baslik}
        </p>

        {/* Açıklama */}
        {gorev.aciklama && (
          <p className="text-xs text-gray-500 line-clamp-2">{gorev.aciklama}</p>
        )}

        {/* Alt görev ilerleme */}
        {toplamAlt > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <FiCheckSquare size={10} />
                {tamamlananAlt}/{toplamAlt}
              </span>
              <span>{ilerleme}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all"
                style={{ width: `${ilerleme}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: Tarih + Badges */}
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            {gorev.son_tarih && (
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                gecmis
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <FiCalendar size={9} />
                {formatTarih(gorev.son_tarih)}
                {gecmis && ' ⚠'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {oncelikCfg && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${oncelikCfg.bg} ${oncelikCfg.text} ${oncelikCfg.border}`}>
                {oncelikCfg.label}
              </span>
            )}
            {gorev.gorev_notlari.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <FiMessageSquare size={10} />
                {gorev.gorev_notlari.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ana Kanban Board ─────────────────────────────────────
export function KanbanBoard({
  locale,
  currentUserId,
  gorevler,
  onAddTask,
  onDeleteTask,
  onUpdateDurum,
  onAddAltGorev,
  onToggleAltGorev,
  onDeleteAltGorev,
  onAddNot,
  onDeleteNot,
  onUpdateGorev,
}: KanbanBoardProps) {
  const [secilenGorev, setSecilenGorev] = useState<Gorev | null>(null);
  const [yeniGorevKolonu, setYeniGorevKolonu] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const kolonGorevleri = (durum: string) =>
    gorevler.filter(g => (g.durum || 'Yapılacak') === durum);

  const acikCount = gorevler.filter(g => g.durum !== 'Tamamlandı').length;
  const gecikmiCount = gorevler.filter(g =>
    g.durum !== 'Tamamlandı' && isGecmis(g.son_tarih)
  ).length;

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Görevlerim</h1>
          <p className="text-sm text-gray-500 mt-1">
            {acikCount} açık görev
            {gecikmiCount > 0 && (
              <span className="ml-2 text-red-500 font-semibold">
                · {gecikmiCount} gecikmiş
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Kanban kolonları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KOLONLAR.map(kolon => {
          const kolonGorevListesi = kolonGorevleri(kolon.durum);
          const ekleAktif = yeniGorevKolonu === kolon.durum;

          return (
            <div key={kolon.durum} className={`rounded-xl border ${kolon.border} ${kolon.bg} flex flex-col`}>
              {/* Kolon başlığı */}
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${kolon.header}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${kolon.dot}`} />
                  <span className="text-sm font-bold">{kolon.label}</span>
                  <span className="text-xs font-bold bg-white/60 px-1.5 py-0.5 rounded-full">
                    {kolonGorevListesi.length}
                  </span>
                </div>
                <button
                  onClick={() => setYeniGorevKolonu(ekleAktif ? null : kolon.durum)}
                  className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                  title="Görev ekle"
                >
                  {ekleAktif ? <FiX size={14} /> : <FiPlus size={14} />}
                </button>
              </div>

              {/* Yeni görev formu */}
              {ekleAktif && (
                <div className="p-3 border-b border-current/10">
                  <form
                    action={async (fd) => {
                      fd.append('durum', kolon.durum);
                      await onAddTask(fd);
                      setYeniGorevKolonu(null);
                    }}
                    className="space-y-2"
                  >
                    <input
                      name="baslik"
                      placeholder="Görev başlığı..."
                      required
                      autoFocus
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        name="son_tarih"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      />
                      <select
                        name="oncelik"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value="Orta">🟡 Orta</option>
                        <option value="Yüksek">🔴 Yüksek</option>
                        <option value="Düşük">🔵 Düşük</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90"
                      >
                        Ekle
                      </button>
                      <button
                        type="button"
                        onClick={() => setYeniGorevKolonu(null)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 bg-white"
                      >
                        İptal
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Görev kartları */}
              <div className="p-3 space-y-2.5 flex-1 min-h-[120px]">
                {kolonGorevListesi.length === 0 && !ekleAktif && (
                  <div className="text-center py-8 text-xs text-gray-400">
                    Görev yok
                  </div>
                )}
                {kolonGorevListesi.map(gorev => (
                  <GorevKarti
                    key={gorev.id}
                    gorev={gorev}
                    onClick={() => setSecilenGorev(gorev)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detay Drawer */}
      {secilenGorev && (
        <GorevDetayDrawer
          gorev={secilenGorev}
          currentUserId={currentUserId}
          onClose={() => setSecilenGorev(null)}
          onUpdateDurum={onUpdateDurum}
          onAddAltGorev={onAddAltGorev}
          onToggleAltGorev={onToggleAltGorev}
          onDeleteAltGorev={onDeleteAltGorev}
          onAddNot={onAddNot}
          onDeleteNot={onDeleteNot}
          onUpdateGorev={onUpdateGorev}
          onDeleteTask={onDeleteTask}
        />
      )}
    </div>
  );
}
