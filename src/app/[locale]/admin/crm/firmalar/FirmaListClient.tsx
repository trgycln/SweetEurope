'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import Link from 'next/link';
import {
    FiSearch, FiGrid, FiList, FiAlertTriangle,
    FiPlus, FiMapPin, FiClock, FiX, FiNavigation, FiChevronDown,
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
    ust_bayi?: { id: string; unvan: string } | null;
    bagli_musteri_sayisi?: number;
    portal_status?: 'active' | 'pending' | 'none';
    portal_last_sign_in_at?: string | null;
    portal_user_count?: number;
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
    gorulmemisWebBasvuru: number;
    portalAktif: number;
    portalPending: number;
    portalYok: number;
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
    currentPortalStatus?: string;
    currentBayiFirmaId?: string;
    temassizActive: boolean;
    hasLocationFilter: boolean;
    kaynakFilter: string;
    cityOptions: string[];
    districtOptions: string[];
    zipCodeOptions: string[];
    zipCodeLabels: Record<string, string>;
    categoryOptions: string[];
    bayiOptions?: Array<{ id: string; unvan: string }>;
    baseDetailPath?: string;
    newCustomerPath?: string;
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
    { value: 'ALL', label: 'Tümü' }, { value: 'ADAY', label: 'Aday' },
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

function formatPortalLastLogin(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 2) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
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
        if (f.parent_firma_id && firmIds.has(f.parent_firma_id)) return;

        const children = parentChildMap.get(f.id) || [];
        processedIds.add(f.id);
        children.forEach(c => processedIds.add(c.id));
        groups.push({ isGroup: children.length > 0, parent: f, children });
    });

    // Orphaned children
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

/* ── Portal Badge Component ─────────────────────────────────────────────── */
function PortalBadge({
    status, lastSignIn, userCount,
}: {
    status?: 'active' | 'pending' | 'none';
    lastSignIn?: string | null;
    userCount?: number;
}) {
    if (status === 'active') {
        const timeText = formatPortalLastLogin(lastSignIn || null);
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold" title={`Son Giriş: ${lastSignIn ? new Date(lastSignIn).toLocaleString('tr-TR') : 'Bilinmiyor'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Aktif</span>
                {timeText && <span className="text-emerald-600 font-normal">({timeText})</span>}
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold" title="Portal hesabı tanımlandı ancak sisteme henüz hiç giriş yapılmadı">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Giriş Bekliyor</span>
            </div>
        );
    }

    return (
        <span className="text-[11px] text-slate-300 font-light">—</span>
    );
}

/* ── Firma Card ──────────────────────────────────────────────────────────── */
function FirmaCard({
    firma, locale, vp,
    isChild = false, isParentInGroup = false, parentUnvan, parentId,
    baseDetailPath = `/${locale}/admin/crm/firmalar`,
}: {
    firma: FirmaItem; locale: string; vp: VPActions;
    isChild?: boolean; isParentInGroup?: boolean; parentUnvan?: string; parentId?: string;
    baseDetailPath?: string;
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
                        <Link href={`${baseDetailPath}/${firma.id}`}
                            className="font-bold text-slate-800 hover:text-blue-600 text-sm leading-tight line-clamp-2">{firma.unvan}</Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge}`}>{label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {firma.ust_bayi?.unvan && (
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0" title="Bağlı Olduğu Alt Bayi">
                                🤝 {firma.ust_bayi.unvan}
                            </span>
                        )}
                        {typeof firma.bagli_musteri_sayisi === 'number' && firma.bagli_musteri_sayisi > 0 && (
                            <Link
                                href={`/${locale}/admin/crm/firmalar?bayi_firma_id=${firma.id}&status=ALL`}
                                onClick={e => e.stopPropagation()}
                                className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 transition-colors"
                                title="Bu bayiye bağlı tüm müşteri ve adayları listele"
                            >
                                👥 {firma.bagli_musteri_sayisi} Müşteri / Portföy
                            </Link>
                        )}
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

                    {/* Portal Durum Rozeti */}
                    {firma.portal_status && firma.portal_status !== 'none' && (
                        <div className="mt-2">
                            <PortalBadge
                                status={firma.portal_status}
                                lastSignIn={firma.portal_last_sign_in_at}
                                userCount={firma.portal_user_count}
                            />
                        </div>
                    )}

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
    baseDetailPath = `/${locale}/admin/crm/firmalar`,
}: {
    firma: FirmaItem; locale: string; vp: VPActions;
    isChild?: boolean; isParentInGroup?: boolean; parentUnvan?: string; parentId?: string;
    baseDetailPath?: string;
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
            onClick={() => router.push(`${baseDetailPath}/${firma.id}`)}
        >
            {/* Checkbox */}
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
            <td className="px-3 py-2.5 min-w-[240px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Link href={`${baseDetailPath}/${firma.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-bold text-slate-900 hover:text-blue-600 text-sm">{firma.unvan}</Link>
                    {firma.ust_bayi?.unvan && (
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md whitespace-nowrap inline-flex items-center gap-1" title="Bağlı Olduğu Alt Bayi">
                            🤝 {firma.ust_bayi.unvan}
                        </span>
                    )}
                    {typeof firma.bagli_musteri_sayisi === 'number' && firma.bagli_musteri_sayisi > 0 && (
                        <Link
                            href={`/${locale}/admin/crm/firmalar?bayi_firma_id=${firma.id}&status=ALL`}
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap inline-flex items-center gap-1 transition-colors"
                            title="Bu bayiye bağlı tüm müşteri ve adayları listele"
                        >
                            👥 {firma.bagli_musteri_sayisi} Müşteri / Portföy
                        </Link>
                    )}
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
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                        {firma.etiketler.map(t => {
                            if (t.startsWith('STRATEJI:') || t.startsWith('FO_URUN:')) {
                                return (
                                    <span key={t} className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-medium" title={t}>
                                        {t.replace(/^(STRATEJI|FO_URUN):\s*/, '')}
                                    </span>
                                );
                            }
                            return (
                                <span key={t} className="text-[9px] text-slate-400 border border-slate-200 rounded px-1 flex-shrink-0">
                                    {t.replace('#', '').replace(/_/g, ' ')}
                                </span>
                            );
                        })}
                    </div>
                )}
            </td>

            {/* Statü */}
            <td className="px-2 py-2.5 whitespace-nowrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
            </td>

            {/* Portal Durumu & Son Giriş */}
            <td className="px-2 py-2.5 whitespace-nowrap">
                <PortalBadge
                    status={firma.portal_status}
                    lastSignIn={firma.portal_last_sign_in_at}
                    userCount={firma.portal_user_count}
                />
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

import PlzRegionModal from '@/components/admin/PlzRegionModal';

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function FirmaListClient({
    firmalar, summary, locale, isAltBayiList,
    currentStatus, currentKategori, currentCity, currentDistrict, currentPlz,
    currentPortalStatus = '',
    currentBayiFirmaId = '',
    temassizActive, hasLocationFilter, kaynakFilter,
    cityOptions, districtOptions, zipCodeOptions, zipCodeLabels, categoryOptions,
    bayiOptions = [],
    baseDetailPath = `/${locale}/admin/crm/firmalar`,
    newCustomerPath = `/${locale}/admin/crm/firmalar/yeni`,
}: Props) {
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [groupMode, setGroupMode] = useState<'grouped' | 'flat'>('grouped');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    // Modals
    const [plzModalOpen, setPlzModalOpen] = useState(false);

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
        setCurrentPage(1);
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

    // Reset pagination when firmalar changes
    useEffect(() => {
        setCurrentPage(1);
    }, [firmalar]);

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
    const TABLE_COL_COUNT = 11;

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
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Portal</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kat.</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">PLZ</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">İlçe</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Telefon</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Son Temas</th>
                            <th className="px-2 py-2 w-14" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(group => {
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
                                    baseDetailPath={baseDetailPath}
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
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Portal</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kat.</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">PLZ</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">İlçe</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Telefon</th>
                            <th className="px-2 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Son Temas</th>
                            <th className="px-2 py-2 w-14" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {firmalar.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(f => (
                            <FirmaTableRow
                                key={f.id}
                                firma={f}
                                locale={locale}
                                vp={vp}
                                isChild={!!(f.parent_firma_id)}
                                baseDetailPath={baseDetailPath}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderCardGrouped = () => (
        <div className="space-y-4">
            {groups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(group => {
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
                                        baseDetailPath={baseDetailPath}
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
                                            baseDetailPath={baseDetailPath}
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
                        baseDetailPath={baseDetailPath}
                    />
                );
            })}
        </div>
    );

    const renderCardFlat = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {firmalar.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(f => (
                <FirmaCard
                    key={f.id}
                    firma={f}
                    locale={locale}
                    vp={vp}
                    isChild={!!(f.parent_firma_id)}
                    baseDetailPath={baseDetailPath}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-4">

            {/* ── Portal & Aktivasyon KPI Kartları ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => setParam('portal_status', '')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                        !currentPortalStatus
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={!currentPortalStatus ? 'text-slate-300' : 'text-slate-500'}>Tüm Firmalar</span>
                        <span className="text-sm">👥</span>
                    </div>
                    <div className="text-2xl font-black mt-1">{summary.toplam}</div>
                    <div className={`text-[11px] mt-0.5 ${!currentPortalStatus ? 'text-slate-400' : 'text-slate-400'}`}>
                        {summary.musteri} müşteri · {summary.numune} numune
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setParam('portal_status', currentPortalStatus === 'active' ? '' : 'active')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                        currentPortalStatus === 'active'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={currentPortalStatus === 'active' ? 'text-emerald-100' : 'text-emerald-700'}>Portal Aktif</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${currentPortalStatus === 'active' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`} />
                    </div>
                    <div className={`text-2xl font-black mt-1 ${currentPortalStatus === 'active' ? 'text-white' : 'text-emerald-700'}`}>
                        {summary.portalAktif}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${currentPortalStatus === 'active' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                        Portala giriş yapmış olanlar
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setParam('portal_status', currentPortalStatus === 'pending' ? '' : 'pending')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                        currentPortalStatus === 'pending'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={currentPortalStatus === 'pending' ? 'text-amber-100' : 'text-amber-700'}>Giriş Bekleyen (Takip)</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${currentPortalStatus === 'pending' ? 'bg-white' : 'bg-amber-400'}`} />
                    </div>
                    <div className={`text-2xl font-black mt-1 ${currentPortalStatus === 'pending' ? 'text-white' : 'text-amber-600'}`}>
                        {summary.portalPending}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${currentPortalStatus === 'pending' ? 'text-amber-100' : 'text-amber-600'}`}>
                        Şifre verildi, hiç girmedi
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setParam('portal_status', currentPortalStatus === 'none' ? '' : 'none')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                        currentPortalStatus === 'none'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-700/20'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={currentPortalStatus === 'none' ? 'text-slate-300' : 'text-slate-600'}>Portalsız Firmalar</span>
                        <span className="text-slate-300 text-xs">⚪</span>
                    </div>
                    <div className={`text-2xl font-black mt-1 ${currentPortalStatus === 'none' ? 'text-white' : 'text-slate-700'}`}>
                        {summary.portalYok}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${currentPortalStatus === 'none' ? 'text-slate-300' : 'text-slate-400'}`}>
                        Henüz portal erişimi yok
                    </div>
                </button>
            </div>

            {/* ── Üst satır: arama + butonlar ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input type="text" placeholder="Firma ara..."
                        defaultValue={searchParams.get('q') || ''}
                        onChange={e => handleSearch(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white w-52" />
                </div>

                {/* İnline Bildirimler */}
                <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                    {summary.gorulmemisWebBasvuru > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                const p = new URLSearchParams(searchParams.toString());
                                if (kaynakFilter === 'web') {
                                    p.delete('kaynak');
                                    p.delete('status');
                                } else {
                                    p.set('kaynak', 'web');
                                    p.delete('status');
                                }
                                router.replace(`${pathname}?${p.toString()}`);
                            }}
                            className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full transition-colors ${
                                kaynakFilter === 'web'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-500 text-white animate-pulse hover:animate-none hover:bg-amber-600'
                            }`}
                        >
                            🆕 <strong>{summary.gorulmemisWebBasvuru}</strong> yeni başvuru
                            {kaynakFilter === 'web' && ' ×'}
                        </button>
                    )}
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

                <Link href={newCustomerPath} prefetch={false}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap">
                    <FiPlus size={13} /> Yeni Firma
                </Link>
                <button type="button" onClick={() => setPlzModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200 transition-colors whitespace-nowrap ml-auto sm:ml-0 border border-purple-200">
                    <FiMapPin size={13} /> Köln PLZ Rehberi
                </button>
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

                {bayiOptions.length > 0 && (
                    <div className="relative">
                        <select
                            value={currentBayiFirmaId || ''}
                            onChange={e => setParam('bayi_firma_id', e.target.value)}
                            className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-purple-200 rounded-lg bg-purple-50/60 focus:outline-none focus:ring-2 focus:ring-purple-300 text-purple-900 font-semibold cursor-pointer min-w-[130px]"
                        >
                            <option value="">🏢 Tüm Portföy (Merkez + Bayiler)</option>
                            <option value="merkez">🏛️ Sadece Merkez</option>
                            {bayiOptions.map(b => (
                                <option key={b.id} value={b.id}>🤝 {b.unvan}</option>
                            ))}
                        </select>
                        <FiChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                    </div>
                )}

                {(hasLocationFilter || temassizActive || currentPortalStatus || currentBayiFirmaId) && (
                    <button type="button" onClick={() => {
                        const p = new URLSearchParams(searchParams.toString());
                        p.delete('city'); p.delete('district'); p.delete('posta_kodu'); p.delete('temassiz'); p.delete('portal_status'); p.delete('bayi_firma_id');
                        router.replace(`${pathname}?${p.toString()}`);
                    }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-2 py-1 transition-colors">
                        <FiX size={11} /> Filtreleri Sıfırla
                    </button>
                )}
            </div>

            {/* ── Aktif Portal Filtresi Bilgi Bandı ── */}
            {currentPortalStatus && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium flex items-center gap-2">
                        <span>Filtre:</span>
                        {currentPortalStatus === 'active' && <span className="font-bold text-emerald-700">🟢 Portala Giriş Yapmış Firmalar ({firmalar.length})</span>}
                        {currentPortalStatus === 'pending' && <span className="font-bold text-amber-700">🟡 Giriş Bekleyen / Şifresi Verilmiş Ama Girmeyenler ({firmalar.length})</span>}
                        {currentPortalStatus === 'none' && <span className="font-bold text-slate-700">⚪️ Henüz Portal Erişimi Olmayanlar ({firmalar.length})</span>}
                    </span>
                    <button
                        type="button"
                        onClick={() => setParam('portal_status', '')}
                        className="text-slate-500 hover:text-slate-800 font-bold"
                    >
                        × Temizle
                    </button>
                </div>
            )}

            {/* ── Kaynak (Web başvurusu) bilgi bandı ── */}
            {kaynakFilter === 'web' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                        🆕 Görülmemiş web başvuruları gösteriliyor ({firmalar.length})
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const p = new URLSearchParams(searchParams.toString());
                            p.delete('kaynak');
                            router.replace(`${pathname}?${p.toString()}`);
                        }}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
                    >
                        × Kaldır
                    </button>
                </div>
            )}

            {/* ── Temassiz bilgi bandı ── */}
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

            {/* ── Sayfalama ── */}
            {firmalar.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-500">
                        {groupMode === 'grouped' ? groups.length : firmalar.length} kayıt içerisinden {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, groupMode === 'grouped' ? groups.length : firmalar.length)} arası gösteriliyor.
                    </span>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                            Önceki
                        </button>
                        <button type="button" disabled={currentPage * PAGE_SIZE >= (groupMode === 'grouped' ? groups.length : firmalar.length)}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                            Sonraki
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            {plzModalOpen && <PlzRegionModal onClose={() => setPlzModalOpen(false)} />}
        </div>
    );
}
