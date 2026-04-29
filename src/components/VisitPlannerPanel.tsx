'use client';

import React, { useState } from 'react';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';
import {
    FiX, FiMapPin, FiTrash2, FiNavigation, FiChevronDown,
    FiChevronUp, FiPhone, FiAlertCircle, FiArrowUp, FiArrowDown,
    FiMap, FiExternalLink, FiAlertTriangle,
} from 'react-icons/fi';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Company = {
    id: string;
    unvan: string;
    adres: string | null;
    sehir: string | null;
    ilce: string | null;
    posta_kodu: string | null;
    google_maps_url: string | null;
    telefon: string | null;
    parent_firma_id: string | null;
};

type ChainGroup = {
    rootId: string;
    rootName: string;
    members: Company[];
    hasRootInList: boolean;
};

type VisitPlanResult = {
    chains: ChainGroup[];
    standalone: Company[];
    orphanedBranches: Company[];
};

/* ── Chain grouping logic ────────────────────────────────────────────────── */
function buildVisitGroups(companies: Company[]): VisitPlanResult {
    const allIds = new Set(companies.map(c => c.id));

    // Find the root ID for each company
    const getRootId = (c: Company): string => {
        if (!c.parent_firma_id) return c.id;
        return c.parent_firma_id;
    };

    // Group by root ID
    const rootMap = new Map<string, Company[]>();
    companies.forEach(c => {
        const rootId = getRootId(c);
        const arr = rootMap.get(rootId) || [];
        arr.push(c);
        rootMap.set(rootId, arr);
    });

    const chains: ChainGroup[] = [];
    const standalone: Company[] = [];
    const orphanedBranches: Company[] = [];

    rootMap.forEach((members, rootId) => {
        if (members.length === 1) {
            const single = members[0];
            // Only a branch selected (parent not in list)
            if (single.parent_firma_id && !allIds.has(single.parent_firma_id)) {
                orphanedBranches.push(single);
            } else {
                standalone.push(single);
            }
        } else {
            // Multiple members sharing a root → chain group
            const rootInList = companies.find(c => c.id === rootId);
            const rootName = rootInList?.unvan
                || members.find(c => !c.parent_firma_id)?.unvan
                || members[0].unvan;
            const hasRootInList = !!rootInList;

            // Sort: root first, branches after
            const sorted = [...members].sort((a, b) => {
                if (!a.parent_firma_id) return -1;
                if (!b.parent_firma_id) return 1;
                return 0;
            });

            chains.push({ rootId, rootName, members: sorted, hasRootInList });
        }
    });

    return { chains, standalone, orphanedBranches };
}

/* ── Company Card ─────────────────────────────────────────────────────── */
function CompanyCard({
    company, index, totalCount, onRemove, onMoveUp, onMoveDown,
}: {
    company: Company;
    index: number;
    totalCount: number;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <div className={`rounded-xl border p-2.5 flex items-start gap-2 transition-colors ${company.google_maps_url ? 'bg-slate-50 border-slate-200' : 'bg-orange-50/50 border-orange-200'}`}>
            {/* Index + reorder */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">
                    {index + 1}
                </div>
                <button onClick={onMoveUp} disabled={index === 0}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors p-0.5">
                    <FiArrowUp size={11} />
                </button>
                <button onClick={onMoveDown} disabled={index === totalCount - 1}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors p-0.5">
                    <FiArrowDown size={11} />
                </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-xs truncate">{company.unvan}</p>
                {(company.adres || company.posta_kodu || company.ilce) && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {company.adres && <span className="truncate block">{company.adres}</span>}
                        <span>
                            {company.posta_kodu && `${company.posta_kodu} `}
                            {company.ilce && `${company.ilce}`}
                            {company.sehir && company.sehir !== company.ilce && `, ${company.sehir}`}
                        </span>
                    </p>
                )}
                {company.telefon && (
                    <a href={`tel:${company.telefon}`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5">
                        <FiPhone size={9} />{company.telefon}
                    </a>
                )}
                <div className="mt-1">
                    {company.google_maps_url ? (
                        <a href={company.google_maps_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-green-600 hover:text-green-800 flex items-center gap-1"
                            onClick={e => e.stopPropagation()}>
                            <FiMapPin size={9} /> Haritada Gör
                            <FiExternalLink size={8} />
                        </a>
                    ) : (
                        <span className="text-[10px] text-orange-500 flex items-center gap-1">
                            <FiAlertCircle size={9} /> Maps linki yok
                        </span>
                    )}
                </div>
            </div>

            {/* Remove */}
            <button onClick={onRemove}
                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                title="Listeden çıkar">
                <FiX size={13} />
            </button>
        </div>
    );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function VisitPlannerPanel() {
    const { selectedCompanies, removeCompany, clearAll, generateRouteUrl } = useVisitPlanner();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<string[]>([]);

    const orderedIds = React.useMemo(() => {
        const existingIds = new Set(selectedCompanies.map(c => c.id));
        const filtered = order.filter(id => existingIds.has(id));
        const newOnes = selectedCompanies.map(c => c.id).filter(id => !filtered.includes(id));
        return [...filtered, ...newOnes];
    }, [selectedCompanies, order]);

    const count = selectedCompanies.length;
    if (count === 0) return null;

    const orderedCompanies = orderedIds
        .map(id => selectedCompanies.find(c => c.id === id))
        .filter(Boolean) as Company[];

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...orderedIds];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setOrder(newOrder);
    };

    const moveDown = (index: number) => {
        if (index === orderedIds.length - 1) return;
        const newOrder = [...orderedIds];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrder(newOrder);
    };

    const withMaps = orderedCompanies.filter(c => c.google_maps_url).length;
    const withoutMaps = count - withMaps;

    const handleRoute = async (useLocation = true) => {
        setIsGenerating(true);
        setError(null);
        try {
            const routeUrl = await generateRouteUrl(useLocation);
            if (routeUrl) {
                window.open(routeUrl, '_blank');
            } else {
                setError('Seçili firmalarda Google Maps linki bulunamadı.');
            }
        } catch {
            setError('Güzergah oluşturulurken hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Build chain groups for display
    const { chains, standalone, orphanedBranches } = buildVisitGroups(orderedCompanies);
    const hasChains = chains.length > 0 || orphanedBranches.length > 0;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[390px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

            {/* Header */}
            <div
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsExpanded(v => !v)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <FiNavigation size={16} />
                    </div>
                    <div>
                        <div className="font-bold text-sm leading-tight">Ziyaret Planlayıcı</div>
                        <div className="text-blue-200 text-[11px] leading-tight">
                            {count} firma seçildi{withMaps > 0 ? ` · ${withMaps} harita linki mevcut` : ''}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {count}
                    </span>
                    {isExpanded ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
                </div>
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="flex flex-col max-h-[560px]">

                    {/* Company List */}
                    <div className="overflow-y-auto flex-1 p-3 space-y-2">

                        {/* ── Zincir grupları ── */}
                        {chains.map(chain => (
                            <div key={chain.rootId} className="rounded-xl border border-purple-200 overflow-hidden">
                                {/* Zincir başlığı */}
                                <div className="bg-purple-50 px-3 py-2 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-purple-800">
                                        ⛓ {chain.rootName} Zinciri
                                    </span>
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                                        {chain.members.length} lokasyon
                                    </span>
                                </div>

                                {/* Üyeler */}
                                <div className="p-2 space-y-1.5">
                                    {chain.members.map((company, idx) => {
                                        const globalIndex = orderedIds.indexOf(company.id);
                                        return (
                                            <div key={company.id}
                                                className={`rounded-lg border p-2 flex items-start gap-2 ${company.google_maps_url ? 'bg-white border-slate-200' : 'bg-orange-50/50 border-orange-200'}`}>
                                                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-semibold text-slate-800 text-xs truncate">{company.unvan}</p>
                                                        {!company.parent_firma_id && (
                                                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded-full flex-shrink-0">Ana</span>
                                                        )}
                                                        {company.parent_firma_id && (
                                                            <span className="text-[9px] text-purple-700 bg-purple-100 px-1 py-0.5 rounded-full flex-shrink-0">Şube</span>
                                                        )}
                                                    </div>
                                                    {(company.ilce || company.sehir) && (
                                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                                            {company.posta_kodu && `${company.posta_kodu} `}{company.ilce || company.sehir}
                                                        </p>
                                                    )}
                                                    {!company.google_maps_url && (
                                                        <span className="text-[10px] text-orange-500 flex items-center gap-1 mt-0.5">
                                                            <FiAlertCircle size={9} /> Maps linki yok
                                                        </span>
                                                    )}
                                                </div>
                                                <button onClick={() => removeCompany(company.id)}
                                                    className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0">
                                                    <FiX size={11} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Zincir ipucu */}
                                <div className="mx-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-[10px] text-blue-700">
                                    💡 Aynı zincir: Tek görüşmede her iki lokasyon için karar alınabilir
                                </div>
                            </div>
                        ))}

                        {/* ── Sadece şube seçili (ana firma seçilmedi) ── */}
                        {orphanedBranches.map(company => (
                            <div key={company.id} className="rounded-xl border border-amber-200 overflow-hidden">
                                <div className="bg-amber-50 px-3 py-1.5 flex items-center gap-1.5">
                                    <FiAlertTriangle size={11} className="text-amber-600" />
                                    <span className="text-[10px] font-semibold text-amber-800">Ana firma seçilmedi</span>
                                </div>
                                <div className="p-2">
                                    <div className="rounded-lg border border-slate-200 bg-white p-2 flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                            ⚠
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-xs truncate">{company.unvan}</p>
                                            <span className="text-[9px] text-purple-700 bg-purple-100 px-1 py-0.5 rounded-full">Şube</span>
                                            {(company.ilce || company.sehir) && (
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    {company.posta_kodu && `${company.posta_kodu} `}{company.ilce || company.sehir}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => removeCompany(company.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0">
                                            <FiX size={11} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* ── Tekil firmalar ── */}
                        {standalone.map((company) => {
                            const index = orderedIds.indexOf(company.id);
                            return (
                                <CompanyCard
                                    key={company.id}
                                    company={company}
                                    index={index}
                                    totalCount={orderedIds.length}
                                    onRemove={() => removeCompany(company.id)}
                                    onMoveUp={() => moveUp(index)}
                                    onMoveDown={() => moveDown(index)}
                                />
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 bg-slate-50/80 p-3 space-y-2.5">

                        {/* Status summary */}
                        <div className="flex gap-3 text-[11px]">
                            {withMaps > 0 && (
                                <span className="text-green-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                    {withMaps} harita linki var
                                </span>
                            )}
                            {withoutMaps > 0 && (
                                <span className="text-orange-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                                    {withoutMaps} linksiz firma — güzergaha dahil edilmez
                                </span>
                            )}
                        </div>

                        {/* Info box */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-700">
                            <div className="font-semibold mb-0.5">📍 Başlangıç Noktası</div>
                            <div>Mevcut konumunuzdan güzergah oluşturulacak. Sıralamayı tekil firmalarda ok butonlarıyla değiştirebilirsiniz.</div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-700 flex items-center gap-1.5">
                                <FiAlertCircle size={12} /> {error}
                            </div>
                        )}

                        {/* Primary: Route from current location */}
                        <button
                            onClick={() => handleRoute(true)}
                            disabled={withMaps === 0 || isGenerating}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Oluşturuluyor...</>
                            ) : (
                                <><FiNavigation size={15} />Konumumdan Güzergah Oluştur</>
                            )}
                        </button>

                        {/* Secondary: Route from first company */}
                        <button
                            onClick={() => handleRoute(false)}
                            disabled={withMaps < 2 || isGenerating}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FiMap size={12} /> İlk Firmadan Başla (konum izinsiz)
                        </button>

                        {/* Clear */}
                        <button
                            onClick={clearAll}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-red-500 hover:text-red-700 text-xs font-semibold transition-colors"
                        >
                            <FiTrash2 size={12} /> Ziyaret Listesini Temizle
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
