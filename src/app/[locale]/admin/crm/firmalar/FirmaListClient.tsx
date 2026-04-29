'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import Link from 'next/link';
import {
    FiSearch, FiGrid, FiList, FiAlertTriangle,
    FiPlus, FiMapPin, FiClock, FiX, FiNavigation, FiChevronDown, FiChevronRight,
} from 'react-icons/fi';
import { FaInstagram } from 'react-icons/fa';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';

/* ── Types ───────────────────────────────────────────────────────────────── */
type FirmaItem = {
    id: string;
    unvan: string;
    status: string | null;
    kategori: string | null;
    sehir: string | null;
    ilce: string | null;
    posta_kodu: string | null;
    adres: string | null;
    telefon: string | null;
    son_etkilesim_tarihi: string | null;
    sorumlu_personel: { tam_ad: string | null } | null;
    oncelik_puani: number | null;
    oncelik: string | null;
    etiketler: string[] | null;
    kaynak: string | null;
    created_at: string | null;
    parent_firma_id: string | null;
    instagram_url: string | null;
    google_maps_url: string | null;
    yetkili_kisi: string | null;
};

type FirmaGroup = {
    isGroup: boolean;
    parent: FirmaItem;
    children: FirmaItem[];
};

type SummaryStats = {
    toplam: number;
    musteri: number;
    numune: number;
    temassiz30: number;
    buHaftaYeni: number;
};

interface Props {
    firmalar: FirmaItem[];
    summary: SummaryStats;
    locale: string;
    isAltBayiList: boolean;
    currentStatus: string;
    currentKategori: string;
    currentCity: string;
    currentDistrict: string;
    currentPlz: string;
    temassizActive: boolean;
    hasLocationFilter: boolean;
    cityOptions: string[];
    districtOptions: string[];
    zipCodeOptions: string[];
    zipCodeLabels: Record<string, string>;
    categoryOptions: string[];
}

type VPCompany = {
    id: string; unvan: string; adres: string | null; sehir: string | null;
    ilce: string | null; posta_kodu: string | null; google_maps_url: string | null;
    telefon: string | null; parent_firma_id: string | null;
};

type VPActions = {
    addCompany: (c: VPCompany) => void;
    removeCompany: (id: string) => void;
    isSelected: (id: string) => boolean;
};

/* ── Style maps ─────────────────────────────────────────────────────────── */
const STATUS_BORDER: Record<string, string> = {
    'MÜŞTERİ': 'border-l-green-500', 'NUMUNE VERİLDİ': 'border-l-purple-500',
    'TEMAS EDİLDİ': 'border-l-blue-500', 'ADAY': 'border-l-amber-400', 'REDDEDİLDİ': 'border-l-red-300',
};
const STATUS_BADGE: Record<string, string> = {
    'MÜŞTERİ': 'bg-green-100 text-green-700', 'NUMUNE VERİLDİ': 'bg-purple-100 text-purple-700',
    'TEMAS EDİLDİ': 'bg-blue-100 text-blue-700', 'ADAY': 'bg-amber-100 text-amber-700',
    'REDDEDİLDİ': 'bg-red-100 text-red-500',
};
const STATUS_AVATAR: Record<string, string> = {
    'MÜŞTERİ': 'bg-green-500', 'NUMUNE VERİLDİ': 'bg-purple-500',
    'TEMAS EDİLDİ': 'bg-blue-500', 'ADAY': 'bg-amber-400', 'REDDEDİLDİ': 'bg-slate-400',
};
const STATUS_LABEL: Record<string, string> = {
    'MÜŞTERİ': 'Müşteri', 'NUMUNE VERİLDİ': 'Numune',
    'TEMAS EDİLDİ': 'Temas', 'ADAY': 'Aday', 'REDDEDİLDİ': 'Reddedildi',
};
const STATUS_CHIPS = [
    { value: '', label: 'Tümü' }, { value: 'ADAY', label: 'Aday' },
    { value: 'TEMAS EDİLDİ', label: 'Temas' }, { value: 'NUMUNE VERİLDİ', label: 'Numune' },
    { value: 'MÜŞTERİ', label: 'Müşteri' }, { value: 'REDDEDİLDİ', label: 'Reddedildi' },
];

const priorityBar = (o: string | null) =>
    o === 'A' ? 'bg-green-500' : o === 'B' ? 'bg-orange-400' : 'bg-slate-300';

/* ── Utilities ──────────────────────────────────────────────────────────── */
function daysSince(date: string | null): number | null {
    if (!date) return null;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function buildGroups(firms: FirmaItem[]): FirmaGroup[] {
    const firmIds = new Set(firms.map(f => f.id));
    const parentChildMap = new Map<string, FirmaItem[]>();

    firms.forEach(f => {
        if (f.parent_firma_id && firmIds.has(f.parent_firma_id)) {
            const arr = parentChildMap.get(f.parent_firma_id) || [];
            arr.push(f);
            parentChildMap.set(f.parent_firma_id, arr);
        }
    });

    const groups: FirmaGroup[] = [];
    const processedIds = new Set<string>();

    firms.forEach(f => {
        if (processedIds.has(f.id)) return;
        // Skip if it's a child whose parent is in the list (will be handled by parent)
        if (f.parent_firma_id && firmIds.has(f.parent_firma_id)) return;

        const children = parentChildMap.get(f.id) || [];
        processedIds.add(f.id);
        children.forEach(c => processedIds.add(c.id));
        groups.push({ isGroup: children.length > 0, parent: f, children });
    });

    // Orphaned children (parent filtered out)
    firms.forEach(f => {
        if (!processedIds.has(f.id)) {
            processedIds.add(f.id);
            groups.push({ isGroup: false, parent: f, children: [] });
        }
    });

    return groups;
}

/* ── ContactDays ────────────────────────────────────────────────────────── */
function ContactDays({ date }: { date: string | null }) {
    const d = daysSince(date);
    if (d === null) return <span className="text-xs text-slate-400">Hiç temas yok</span>;
    if (d === 0) return <span className="text-xs text-green-600 font-medium">Bugün</span>;
    if (d <= 7) return <span className="text-xs text-green-600">{d} gün önce</span>;
    if (d <= 30) return <span className="text-xs text-amber-600">{d} gün önce</span>;
    return <span className="text-xs text-red-500 font-semibold">{d} gün önce</span>;
}

/* ── Firma Card ──────────────────────────────────────────────────────────── */
function FirmaCard({
    firma, locale, vp,
    isChild = false, isParentInGroup = false, parentUnvan, parentId,
}: {
    firma: FirmaItem; locale: string; vp: VPActions;
    isChild?: boolean; isParentInGroup?: boolean; parentUnvan?: string; parentId?: string;
}) {
    const selected = vp.isSelected(firma.id);
    const status = (firma.status || 'ADAY').toUpperCase().trim();
    const avatarBg = STATUS_AVATAR[status] || 'bg-slate-400';
    const badge = STATUS_BADGE[status] || 'bg-slate-100 text-slate-600';
    const label = STATUS_LABEL[status] || status;
    const border = STATUS_BORDER[status] || 'border-l-slate-300';
    const d = daysSince(firma.son_etkilesim_tarihi);

    const toggle = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (selected) vp.removeCompany(firma.id);
        else vp.addCompany({
            id: firma.id, unvan: firma.unvan, adres: firma.adres, sehir: firma.sehir,
            ilce: firma.ilce, posta_kodu: firma.posta_kodu, google_maps_url: firma.google_maps_url,
            telefon: firma.telefon, parent_firma_id: firma.parent_firma_id,
        });
    };

    return (
        <div className={`bg-white rounded-xl border border-l-4 ${border} ${selected ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow ${isChild ? 'ml-3 border-l-purple-200' : ''}`}>
            <div className="p-4 flex items-start gap-3">
                <button type="button" onClick={toggle}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 hover:border-blue-400'}`}>
                    {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarBg}`}>
                    {(firma.unvan || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <Link href={`/${locale}/admin/crm/firmalar/${firma.id}`}
                            className="font-bold text-slate-800 hover:text-blue-600 text-sm leading-tight line-clamp-2">{firma.unvan}</Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge}`}>{label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {isParentInGroup && (
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Ana Lokasyon</span>
                        )}
                        {isChild && (
                            <span className="text-[9px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">Şube</span>
                        )}
                        {firma.kategori && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{firma.kategori}</span>
                        )}
                        {(firma.posta_kodu || firma.ilce || firma.sehir) && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                                <FiMapPin size={9} />{firma.posta_kodu ? `${firma.posta_kodu} ` : ''}{firma.ilce || firma.sehir}
                            </span>
                        )}
                        {(d === null || d > 30) && <span className="text-[10px] font-semibold text-red-500">⚠ Takip!</span>}
                    </div>
                    {isChild && parentUnvan && parentId && (
                        <Link href={`/${locale}/admin/crm/firmalar/${parentId}`}
                            onClick={e => e.stopPropagation()}
                            className="mt-1 text-[10px] text-slate-400 hover:text-blue-500 flex items-center gap-0.5">
                            ↑ Ana: {parentUnvan}
                        </Link>
                    )}
                </div>
            </div>
            <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
                {firma.telefon && (
                    <a href={`tel:${firma.telefon}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600">
                        📞 {firma.telefon}
                    </a>
                )}
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                        <FiClock size={10} className="text-slate-400" /><ContactDays date={firma.son_etkilesim_tarihi} />
                    </span>
                    <div className="flex gap-2 items-center">
                        {firma.instagram_url && (
                            <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer"
                                className="text-pink-400 hover:text-pink-600">
                                <FaInstagram size={13} />
                            </a>
                        )}
                        {firma.google_maps_url && (
                            <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-700">
                                <FiMapPin size={13} />
                            </a>
                        )}
                        <Link href={`/${locale}/admin/crm/firmalar/${firma.id}/etkinlikler`}
                            className="text-[11px] text-slate-500 hover:text-blue-600 font-medium">📝</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Group Card Header ───────────────────────────────────────────────────── */
function GroupCardHeader({
    group, isCollapsed, onToggle,
}: {
    group: FirmaGroup; isCollapsed: boolean; onToggle: () => void;
}) {
    const locationCount = group.children.length + 1;
    const decisionMaker = group.parent.yetkili_kisi || group.parent.sorumlu_personel?.tam_ad;
    return (
        <div
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 cursor-pointer select-none hover:bg-slate-100 transition-colors"
            onClick={onToggle}
        >
            <button type="button" className="text-slate-500 flex-shrink-0">
                <FiChevronDown
                    size={15}
                    className="transition-transform duration-200"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                />
            </button>
            <span className="font-bold text-slate-800 text-sm truncate">{group.parent.unvan}</span>
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                ⛓ Zincir · {locationCount} lokasyon
            </span>
            <div className="flex-1" />
            <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:block">
                {[group.parent.sehir || group.parent.ilce, decisionMaker].filter(Boolean).join(' · ')}
            </span>
        </div>
    );
}

/* ── Group Table Header Row ──────────────────────────────────────────────── */
function GroupTableHeaderRow({
    group, isCollapsed, onToggle, colCount,
}: {
    group: FirmaGroup; isCollapsed: boolean; onToggle: () => void; colCount: number;
}) {
    const locationCount = group.children.length + 1;
    const decisionMaker = group.parent.yetkili_kisi || group.parent.sorumlu_personel?.tam_ad;
    return (
        <tr className="bg-slate-50 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={onToggle}>
            <td colSpan={colCount} className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                    <button type="button" className="text-slate-500 flex-shrink-0">
                        <FiChevronDown
                            size={14}
                            className="transition-transform duration-200"
                            style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                        />
                    </button>
                    <span className="font-bold text-slate-800 text-sm">{group.parent.unvan}</span>
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        ⛓ Zincir · {locationCount} lokasyon
                    </span>
                    <div className="flex-1" />
                    <span className="text-[11px] text-slate-400 hidden sm:block">
                        {[group.parent.sehir || group.parent.ilce, decisionMaker].filter(Boolean).join(' · ')}
                    </span>
                </div>
            </td>
        </tr>
    );
}

/* ── Firma Table Row ─────────────────────────────────────────────────────── */
function FirmaTableRow({
    firma, locale, vp,
    isChild = false, isParentInGroup = false, parentUnvan, parentId,
}: {
    firma: FirmaItem; locale: string; vp: VPActions;
    isChild?: boolean; isParentInGroup?: boolean; parentUnvan?: string; parentId?: string;
}) {
    const router = useRouter();
    const selected = vp.isSelected(firma.id);
    const status = (firma.status || 'ADAY').toUpperCase().trim();
    const badge = STATUS_BADGE[status] || 'bg-slate-100 text-slate-600';
    const label = STATUS_LABEL[status] || status;
    const pBar = priorityBar(firma.oncelik);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selected) vp.removeCompany(firma.id);
        else vp.addCompany({
            id: firma.id, unvan: firma.unvan, adres: firma.adres, sehir: firma.sehir,
            ilce: firma.ilce, posta_kodu: firma.posta_kodu, google_maps_url: firma.google_maps_url,
            telefon: firma.telefon, parent_firma_id: firma.parent_firma_id,
        });
    };

    const bgClass = isChild
        ? (selected ? 'bg-blue-50/60' : 'bg-slate-50/40 hover:bg-slate-50/70')
        : (selected ? 'bg-blue-50/60' : 'hover:bg-slate-50/60');

    const trStyle = isChild ? { borderLeft: '2px solid #e9d5ff' } : undefined;

    return (
        <tr
            className={`transition-colors group cursor-pointer ${bgClass}`}
            style={trStyle}
            onClick={() => router.push(`/${locale}/admin/crm/firmalar/${firma.id}`)}
        >
            {/* Checkbox — with L-shape connector for children */}
            <td className="py-2.5 pr-2 relative" style={{ paddingLeft: isChild ? '28px' : '16px' }}>
                {isChild && (
                    <>
                        <div className="absolute top-0 bottom-[50%] border-l-2 border-slate-200"
                            style={{ left: '10px' }} />
                        <div className="absolute border-b-2 border-slate-200"
                            style={{ left: '10px', top: '50%', width: '10px', height: '1px' }} />
                    </>
                )}
                <button type="button" onClick={toggle}
                    className={`w-[17px] h-[17px] rounded border-2 flex items-center justify-center transition-colors relative z-10 ${selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 hover:border-blue-400'}`}>
                    {selected && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                </button>
            </td>

            {/* Priority bar */}
            <td className="pr-3 py-2.5">
                <div className={`w-[3px] h-6 rounded-full ${pBar}`} />
            </td>

            {/* Firma name + badges + alt bilgi */}
            <td className="px-2 py-2.5 max-w-[200px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`/${locale}/admin/crm/firmalar/${firma.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-semibold text-slate-800 hover:text-blue-600 text-sm truncate">{firma.unvan}</Link>
                    {isParentInGroup && (
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            Ana Lokasyon
                        </span>
                    )}
                    {isChild && (
                        <span className="text-[9px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            Şube
                        </span>
                    )}
                </div>
                {isChild && parentUnvan && parentId && (
                    <Link href={`/${locale}/admin/crm/firmalar/${parentId}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] text-slate-400 hover:text-blue-500 mt-0.5 flex items-center gap-0.5">
                        ↑ Ana: {parentUnvan}
                    </Link>
                )}
                {!isChild && firma.etiketler && firma.etiketler.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                        {firma.etiketler.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] text-slate-400 border border-slate-200 rounded px-1">
                                {t.replace('#', '').replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                )}
            </td>

            {/* Statü */}
            <td className="px-2 py-2.5 whitespace-nowrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
            </td>

            {/* Kategori */}
            <td className="px-2 py-2.5 whitespace-nowrap text-[11px] text-slate-500">
                {firma.kategori || <span className="text-slate-300">—</span>}
            </td>

            {/* PLZ */}
            <td className="px-2 py-2.5 whitespace-nowrap text-[11px] font-mono text-slate-500">
                {firma.posta_kodu || <span className="text-slate-300">—</span>}
            </td>

            {/* İlçe */}
            <td className="px-2 py-2.5 whitespace-nowrap text-xs text-slate-600">
                {firma.ilce || firma.sehir || <span className="text-slate-300">—</span>}
            </td>

            {/* Telefon */}
            <td className="px-2 py-2.5 whitespace-nowrap text-xs text-slate-600">
                {firma.telefon
                    ? <a href={`tel:${firma.telefon}`} onClick={e => e.stopPropagation()} className="hover:text-blue-600">{firma.telefon}</a>
                    : <span className="text-slate-300">—</span>}
            </td>

            {/* Son temas */}
            <td className="px-2 py-2.5 whitespace-nowrap">
                <ContactDays date={firma.son_etkilesim_tarihi} />
            </td>

            {/* Aksiyon butonları */}
            <td className="px-2 py-2.5 whitespace-nowrap">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/${locale}/admin/crm/firmalar/${firma.id}/etkinlikler`}
                        onClick={e => e.stopPropagation()}
                        className="text-slate-400 hover:text-blue-600 text-sm" title="Etkinlik Sayfası">
                        📝
                    </Link>
                    {firma.telefon && (
                        <a href={`tel:${firma.telefon}`}
                            onClick={e => e.stopPropagation()}
                            className="text-slate-400 hover:text-green-600 text-sm" title="Ara">
                            📞
                        </a>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* ── Compact Select ──────────────────────────────────────────────────────── */
function CompactSelect({ value, options, placeholder, onChange, renderOption }: {
    value: string; options: string[]; placeholder: string;
    onChange: (v: string) => void; renderOption?: (v: string) => string;
}) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 cursor-pointer min-w-[110px]">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>)}
            </select>
            <FiChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function FirmaListClient({
    firmalar, summary, locale, isAltBayiList,
    currentStatus, currentKategori, currentCity, currentDistrict, currentPlz,
    temassizActive, hasLocationFilter,
    cityOptions, districtOptions, zipCodeOptions, zipCodeLabels, categoryOptions,
}: Props) {
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [groupMode, setGroupMode] = useState<'grouped' | 'flat'>('grouped');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { selectedCompanies, addCompany, removeCompany, isSelected } = useVisitPlanner();
    const vp: VPActions = { addCompany, removeCompany, isSelected };

    // Load saved preferences
    useEffect(() => {
        const vm = localStorage.getItem('firma_view_mode') as 'card' | 'list' | null;
        const gm = localStorage.getItem('firma_group_mode') as 'grouped' | 'flat' | null;
        if (vm === 'card' || vm === 'list') setViewMode(vm);
        if (gm === 'grouped' || gm === 'flat') setGroupMode(gm);
    }, []);

    const handleViewMode = (mode: 'card' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('firma_view_mode', mode);
    };

    const handleGroupMode = (mode: 'grouped' | 'flat') => {
        setGroupMode(mode);
        localStorage.setItem('firma_group_mode', mode);
    };

    const toggleGroup = (id: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const groups = useMemo(() => buildGroups(firmalar), [firmalar]);

    const handleSearch = useDebouncedCallback((term: string) => {
        const p = new URLSearchParams(searchParams.toString());
        if (term) p.set('q', term); else p.delete('q');
        router.replace(`${pathname}?${p.toString()}`);
    }, 300);

    const setParam = (key: string, value: string) => {
        const p = new URLSearchParams(searchParams.toString());
        if (value) p.set(key, value); else p.delete(key);
        router.replace(`${pathname}?${p.toString()}`);
    };

    const selectAllVisible = () => {
        firmalar.forEach(f => {
            if (!isSelected(f.id)) addCompany({
                id: f.id, unvan: f.unvan, adres: f.adres, sehir: f.sehir,
                ilce: f.ilce, posta_kodu: f.posta_kodu, google_maps_url: f.google_maps_url,
                telefon: f.telefon, parent_firma_id: f.parent_firma_id,
            });
        });
    };

    const selectedCount = selectedCompanies.length;

    /* ── Render helpers ── */
    const TABLE_COL_COUNT = 10;

    const renderTableGrouped = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="pr-2 py-2 w-10" />
                            <th className="pr-3 py-2 w-2" />
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Firma</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Statü</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kat.</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">PLZ</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">İlçe</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Telefon</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Son Temas</th>
                            <th className="px-2 py-2 w-14" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groups.map(group => {
                            const isCollapsed = collapsedGroups.has(group.parent.id);
                            if (group.isGroup) {
                                return (
                                    <Fragment key={`grp-${group.parent.id}`}>
                                        <GroupTableHeaderRow
                                            group={group}
                                            isCollapsed={isCollapsed}
                                            onToggle={() => toggleGroup(group.parent.id)}
                                            colCount={TABLE_COL_COUNT}
                                        />
                                        {!isCollapsed && (
                                            <>
                                                <FirmaTableRow
                                                    firma={group.parent}
                                                    locale={locale}
                                                    vp={vp}
                                                    isParentInGroup={true}
                                                />
                                                {group.children.map(child => (
                                                    <FirmaTableRow
                                                        key={`child-${child.id}`}
                                                        firma={child}
                                                        locale={locale}
                                                        vp={vp}
                                                        isChild={true}
                                                        parentUnvan={group.parent.unvan}
                                                        parentId={group.parent.id}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </Fragment>
                                );
                            }
                            return (
                                <FirmaTableRow
                                    key={group.parent.id}
                                    firma={group.parent}
                                    locale={locale}
                                    vp={vp}
                                    isChild={!!(group.parent.parent_firma_id)}
                                    parentUnvan={undefined}
                                    parentId={undefined}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTableFlat = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="pr-2 py-2 w-10" />
                            <th className="pr-3 py-2 w-2" />
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Firma</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Statü</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kat.</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">PLZ</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">İlçe</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Telefon</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Son Temas</th>
                            <th className="px-2 py-2 w-14" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {firmalar.map(f => (
                            <FirmaTableRow
                                key={f.id}
                                firma={f}
                                locale={locale}
                                vp={vp}
                                isChild={!!(f.parent_firma_id)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderCardGrouped = () => (
        <div className="space-y-4">
            {groups.map(group => {
                const isCollapsed = collapsedGroups.has(group.parent.id);
                if (group.isGroup) {
                    return (
                        <div key={group.parent.id} className="space-y-2">
                            <GroupCardHeader
                                group={group}
                                isCollapsed={isCollapsed}
                                onToggle={() => toggleGroup(group.parent.id)}
                            />
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pl-2">
                                    <FirmaCard
                                        firma={group.parent}
                                        locale={locale}
                                        vp={vp}
                                        isParentInGroup={true}
                                    />
                                    {group.children.map(child => (
                                        <FirmaCard
                                            key={child.id}
                                            firma={child}
                                            locale={locale}
                                            vp={vp}
                                            isChild={true}
                                            parentUnvan={group.parent.unvan}
                                            parentId={group.parent.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }
                return (
                    <FirmaCard
                        key={group.parent.id}
                        firma={group.parent}
                        locale={locale}
                        vp={vp}
                        isChild={!!(group.parent.parent_firma_id)}
                    />
                );
            })}
        </div>
    );

    const renderCardFlat = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {firmalar.map(f => (
                <FirmaCard
                    key={f.id}
                    firma={f}
                    locale={locale}
                    vp={vp}
                    isChild={!!(f.parent_firma_id)}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-3">

            {/* ── Üst satır: arama + istatistik + butonlar ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input type="text" placeholder="Firma ara..."
                        defaultValue={searchParams.get('q') || ''}
                        onChange={e => handleSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-52" />
                </div>

                {/* İnline istatistik */}
                <div className="flex items-center gap-3 text-xs text-slate-500 px-2">
                    <span><strong className="text-slate-700">{summary.toplam}</strong> firma</span>
                    <span className="text-green-600"><strong>{summary.musteri}</strong> müşteri</span>
                    <span className="text-purple-600"><strong>{summary.numune}</strong> numune</span>
                    {summary.temassiz30 > 0 && (
                        <button type="button"
                            onClick={() => {
                                const p = new URLSearchParams(searchParams.toString());
                                p.set('temassiz', '1'); p.delete('status');
                                router.replace(`${pathname}?${p.toString()}`);
                            }}
                            className="text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                            <FiAlertTriangle size={11} /><strong>{summary.temassiz30}</strong> temassız
                        </button>
                    )}
                </div>

                <div className="flex-1" />

                {/* Gruplu/Düz toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button type="button" onClick={() => handleGroupMode('grouped')}
                        className={`px-2 py-1.5 rounded-md transition-colors text-[11px] font-semibold ${groupMode === 'grouped' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Zincir gruplu görünüm">
                        ⛓ Gruplu
                    </button>
                    <button type="button" onClick={() => handleGroupMode('flat')}
                        className={`px-2 py-1.5 rounded-md transition-colors text-[11px] font-semibold ${groupMode === 'flat' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Düz liste">
                        Düz
                    </button>
                </div>

                {/* Kart/Liste toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button type="button" onClick={() => handleViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`} title="Liste">
                        <FiList size={14} />
                    </button>
                    <button type="button" onClick={() => handleViewMode('card')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`} title="Kart">
                        <FiGrid size={14} />
                    </button>
                </div>

                <Link href={`/${locale}/admin/crm/firmalar/yeni${isAltBayiList ? '?ticari_tip=alt_bayi' : ''}`} prefetch={false}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap">
                    <FiPlus size={13} /> Yeni Firma
                </Link>
            </div>

            {/* ── Filtre satırı ── */}
            <div className="flex flex-wrap items-center gap-2">
                {STATUS_CHIPS.map(chip => (
                    <button key={chip.value} type="button" onClick={() => setParam('status', chip.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${currentStatus === chip.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {chip.label}
                    </button>
                ))}

                <div className="w-px h-4 bg-slate-200" />

                {cityOptions.length > 0 && (
                    <CompactSelect value={currentCity} options={cityOptions} placeholder="Şehir" onChange={v => setParam('city', v)} />
                )}
                {districtOptions.length > 0 && (
                    <CompactSelect value={currentDistrict} options={districtOptions} placeholder="İlçe" onChange={v => setParam('district', v)} />
                )}
                {zipCodeOptions.length > 0 && (
                    <CompactSelect value={currentPlz} options={zipCodeOptions} placeholder="PLZ"
                        onChange={v => setParam('posta_kodu', v)}
                        renderOption={v => zipCodeLabels[v] || v} />
                )}
                {categoryOptions.length > 0 && (
                    <CompactSelect value={currentKategori} options={categoryOptions} placeholder="Kategori" onChange={v => setParam('kategori', v)} />
                )}

                {(hasLocationFilter || temassizActive) && (
                    <button type="button" onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.delete('city'); p.delete('district'); p.delete('posta_kodu'); p.delete('temassiz');
                        router.replace(`${pathname}?${p.toString()}`);
                    }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-2 py-1 transition-colors">
                        <FiX size={11} /> Temizle
                    </button>
                )}
            </div>

            {/* ── Temassız bilgi bandı ── */}
            {temassizActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                        <FiAlertTriangle size={13} /> 30+ gündür temassız firmalar ({firmalar.length})
                    </span>
                    <button type="button" onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.delete('temassiz'); router.replace(`${pathname}?${p.toString()}`);
                    }} className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold">× Kaldır</button>
                </div>
            )}

            {/* ── Visit planner seçim bandı ── */}
            {selectedCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                        <FiNavigation size={13} /> {selectedCount} firma ziyaret listesinde
                    </span>
                    <span className="text-[11px] text-blue-500">Sağ alttaki panelden güzergah oluşturun</span>
                </div>
            )}

            {/* ── Sonuç sayısı + tümünü seç ── */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{firmalar.length} firma listelendi</p>
                {firmalar.length > 0 && firmalar.length <= 100 && (
                    <button type="button" onClick={selectAllVisible}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        <FiNavigation size={10} /> Tümünü Ziyaret Listesine Ekle ({firmalar.length})
                    </button>
                )}
            </div>

            {/* ── Boş durum ── */}
            {firmalar.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-slate-600 font-semibold text-sm">Sonuç bulunamadı</p>
                    <p className="text-slate-400 text-xs mt-1">Filtre kriterini değiştirmeyi deneyin.</p>
                </div>
            )}

            {/* ── İçerik: görünüm modu kombinasyonu ── */}
            {firmalar.length > 0 && viewMode === 'list' && groupMode === 'grouped' && renderTableGrouped()}
            {firmalar.length > 0 && viewMode === 'list' && groupMode === 'flat' && renderTableFlat()}
            {firmalar.length > 0 && viewMode === 'card' && groupMode === 'grouped' && renderCardGrouped()}
            {firmalar.length > 0 && viewMode === 'card' && groupMode === 'flat' && renderCardFlat()}
        </div>
    );
}
