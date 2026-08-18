// src/app/[locale]/admin/dashboard/page.tsx — CEO Cockpit v3

import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
    FiUsers, FiPackage, FiClipboard, FiBriefcase, FiTruck,
    FiAlertTriangle, FiCheckCircle, FiArchive, FiBox,
    FiExternalLink, FiAlertCircle, FiCalendar, FiDollarSign,
    FiPieChart, FiCheckSquare, FiActivity, FiBell
} from 'react-icons/fi';
import Link from 'next/link';
import { Enums } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { unstable_noStore as noStore } from 'next/cache';

import { DistributorsList } from '@/components/admin/dashboard/DistributorsList';
import { CustomerOverview } from '@/components/admin/dashboard/CustomerOverview';
import GorevDurumWidget from '@/components/admin/dashboard/GorevDurumWidget';
import DashboardPeriodTabs from '@/components/admin/dashboard/DashboardPeriodTabs';
import KasaKalanCard from '@/components/admin/dashboard/KasaKalanCard';
import HedefTakipCard from '@/components/admin/dashboard/HedefTakipCard';
import CockpitAppGrid from '@/components/admin/dashboard/CockpitAppGrid';
import { AnimatedDashboardContainer, AnimatedCard } from '@/components/admin/dashboard/AnimatedDashboardWrapper';
import { AnimatedNumber } from '@/components/admin/dashboard/AnimatedNumber';
import { getCachedDashboardData } from '@/lib/admin/cache-utils';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtNum = (v: number | null | undefined) =>
    new Intl.NumberFormat('tr-TR').format(v ?? 0);

function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPeriodDates(period: string, now: Date) {
    const y = now.getFullYear(); const mo = now.getMonth();
    if (period === 'gecen-ay') return { start: toLocalDate(new Date(y, mo - 1, 1)), end: toLocalDate(new Date(y, mo, 0)) };
    if (period === 'bu-yil')   return { start: toLocalDate(new Date(y, 0, 1)),       end: toLocalDate(now) };
    return { start: toLocalDate(new Date(y, mo, 1)), end: toLocalDate(now) };
}

const PERIOD_LABEL: Record<string, string> = { 'bu-ay': 'Bu Ay (MTD)', 'gecen-ay': 'Geçen Ay', 'bu-yil': 'Bu Yıl (YTD)' };

// ── Küçük yardımcı bileşenler ─────────────────────────────────────────────────

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-[12px] text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 whitespace-nowrap transition-colors">
            {children} <FiExternalLink size={10} />
        </Link>
    );
}

function MiniCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-xl font-bold ${warn ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
        </div>
    );
}

function HealthCard({ title, value, hint, tag, tagColor }: {
    title: string; value: string; hint: string;
    tag: string; tagColor: 'red' | 'green' | 'yellow';
}) {
    const tagCls = { red: 'bg-red-100 text-red-700', green: 'bg-green-100 text-green-700', yellow: 'bg-amber-100 text-amber-700' }[tagColor];
    const borderCls = { red: 'border-red-200 bg-red-50/30', green: 'border-green-200 bg-green-50/30', yellow: 'border-amber-200 bg-amber-50/30' }[tagColor];
    return (
        <div className={`rounded-xl border p-4 ${borderCls}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagCls}`}>{tag}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{hint}</p>
        </div>
    );
}

type ReportData = {
    totalGrossRevenue: number; totalRevenue: number; totalCogs: number;
    grossProfit: number; totalExpenses: number; netProfit: number;
};

// ── TeamMember Dashboard ──────────────────────────────────────────────────────

async function TeamMemberDashboard({ userId, locale, dictionary, cookieStore }: { userId: string; locale: string; dictionary: any; cookieStore: any }) {
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data } = await supabase.rpc('get_dashboard_summary_for_member', { p_member_id: userId }).single();
    const safeData = (typeof data === 'object' && data && !Array.isArray(data)) ? data : {};
    const openTasks = Number((safeData as any).openTasksCount ?? 0);
    const newOrders = Number((safeData as any).newOrdersCount ?? 0);
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Açık Görev', value: isNaN(openTasks) ? 0 : openTasks, href: `/${locale}/admin/gorevler`, color: 'text-blue-700' },
                    { label: 'Yeni Sipariş', value: isNaN(newOrders) ? 0 : newOrders, href: `/${locale}/admin/operasyon/siparisler`, color: 'text-green-700' },
                ].map(s => (
                    <Link key={s.label} href={s.href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
                    </Link>
                ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4">
                <Link href={`/${locale}/admin/crm/firmalar`} className="text-sm font-semibold text-blue-600 hover:underline">Müşterilerim →</Link>
                <Link href={`/${locale}/admin/gorevler`}    className="text-sm font-semibold text-blue-600 hover:underline">Görevlerim →</Link>
            </div>
        </div>
    );
}

// ── Manager Dashboard ─────────────────────────────────────────────────────────

async function ManagerDashboard({ locale, period, dictionary, cookieStore, userId }: {
    locale: string; period: string; dictionary: any; cookieStore: any; userId: string;
}) {
    const supabase: any = await createSupabaseServerClient(cookieStore);
    const now = new Date();
    const { start: periodStart, end: periodEnd } = getPeriodDates(period, now);
    const todayISO          = now.toISOString();

    // ── Paralel sorgular (Önbellekten) ──────────────────────────────────────────────
    const dashboardData = await getCachedDashboardData(period);

    const [
        benimRes,
        overdueRes,
        upcomingRes
    ] = await Promise.all([
        supabase.from('gorevler').select('id, baslik, son_tarih, oncelik').eq('tamamlandi', false).eq('atanan_kisi_id', userId).order('son_tarih', { ascending: true, nullsFirst: false }).limit(10),
        supabase.from('gorevler').select('id, baslik, son_tarih, oncelik').eq('tamamlandi', false).lt('son_tarih', todayISO).order('son_tarih', { ascending: true }).limit(10),
        supabase.from('gorevler').select('id, baslik, son_tarih, oncelik').eq('tamamlandi', false).gte('son_tarih', todayISO).order('son_tarih', { ascending: true }).limit(10), // simplified
        supabase.rpc('get_kasa_ozeti')
    ]);

    const {
        plRes, plPrevRes, stokRes, urunToplamRes, 
        aktifSiparisRes, siparisDagRes, sonTirRes, yaklasenTirRes,
        adayRes, temasRes, musteriRes, yeniTemasRes, 
        alarmUrunlerRes, settingsRes, yeniMusteriRes, 
        sipAdetRes, alarmCountRes, batchHistRes
    } = dashboardData;

    // ── Veri işle ─────────────────────────────────────────────────────────────
    const mtd     = plRes.data as any;
    const prevMtd = plPrevRes.data as any;
    const deltaPct = prevMtd?.totalRevenue
        ? Math.round(((mtd?.totalRevenue ?? 0) - prevMtd.totalRevenue) / prevMtd.totalRevenue * 100)
        : null;

    const stokDegeri      = (stokRes.data || []).reduce((s: number, u: any) => s + (Number(u.distributor_alis_fiyati || 0) * Number(u.stok_miktari || 0)), 0);
    const urunToplamCount = urunToplamRes.count ?? 0;

    // Kritik stok: stok > 0 VE stok_esigi altında.
    // Stoku 0 olanlar "stok yok" kategorisi, kritik değil.
    // stok_esigi tanımlı değilse (NULL veya 0) varsayılan 10 kabul edilir.
    const kritikStok = (stokRes.data || []).filter((u: any) => {
        const stok = Number(u.stok_miktari ?? 0);
        const esik = Number(u.stok_esigi ?? 0) > 0 ? Number(u.stok_esigi) : 10;
        return stok > 0 && stok < esik;
    }).length;

    const sipDag = (siparisDagRes.data || []) as Array<{ siparis_durumu: string }>;
    const sipCount = (statuses: string[]) => sipDag.filter(d => statuses.includes(d.siparis_durumu)).length;

    const sonTir      = (sonTirRes.data || [])[0] ?? null;
    const sonTirler   = (batchHistRes.data || []).slice(0, 3);
    const yaklasenTir = (yaklasenTirRes.data || [])[0] ?? null;

    const adayCount    = adayRes.count   ?? 0;
    const temasTotal   = temasRes.count  ?? 0;
    const musteriCount = musteriRes.count ?? 0;
    const yeniTemasCount = yeniTemasRes.count ?? 0;
    const toplamFunnel = adayCount + temasTotal + musteriCount;

    const mapTask = (t: any) => ({ id: t.id, baslik: t.baslik, son_tarih: t.son_tarih, oncelik: t.oncelik ?? null, atanan_kisi_adi: null });
    const overdueTasks  = (overdueRes.data  || []).map(mapTask);
    const upcomingTasks = (upcomingRes.data  || []).map(mapTask);
    const myTasks       = (benimRes.data     || []).map(mapTask);

    const alarmUrunler  = alarmUrunlerRes.data  ?? [];
    const alarmCount    = alarmCountRes.count ?? 0;
    const alarmOrt      = alarmCount > 0 ? alarmUrunler.reduce((s: number, u: any) => s + Math.abs(Number(u.son_maliyet_sapma_yuzde || 0)), 0) / alarmUrunler.length : 0;

    const settings: Record<string, number> = {};
    for (const s of (settingsRes.data || []) as any[]) { const n = Number(s.setting_value); if (Number.isFinite(n)) settings[s.setting_key] = n; }
    
    const kasaOzetRes = await supabase.rpc('get_kasa_ozeti');
    const ozetRow = kasaOzetRes.data?.[0] || { banka_bakiye: 0, nakit_bakiye: 0 };
    const kasaBakiyesi = (ozetRow.banka_bakiye || 0) + (ozetRow.nakit_bakiye || 0);
    
    const hedefCiro      = settings.hedef_ciro     ?? 50000;
    const hedefMusteri   = settings.hedef_musteri  ?? 5;
    const hedefTemas     = settings.hedef_temas    ?? 10;
    const hedefSiparis   = settings.hedef_siparis  ?? 20;
    const yeniMusteriCnt = yeniMusteriRes.count    ?? 0;

    const sipAdetData = (sipAdetRes.data || []) as Array<{ siparis_durumu: string }>;
    const sipPeriodCount = (statuses: string[]) => sipAdetData.filter(d => statuses.includes(d.siparis_durumu)).length;

    const teslimEdilenCount = sipPeriodCount(['Teslim Edildi', 'delivered']);
    const beklemeydeCount   = sipPeriodCount(['Beklemede']);
    const hazirlaniyorCount = sipPeriodCount(['Hazırlanıyor', 'processing']);
    const yoldaCount        = sipPeriodCount(['Yola Çıktı', 'shipped']);
    const iptalTalepCount   = sipPeriodCount(['iptal_talep_edildi', 'İptal Talep Edildi']);
    const iptalCount        = sipPeriodCount(['İptal Edildi', 'cancelled']);
    const toplamSiparisCount = sipAdetData.length;
    const aktifSiparisCount = beklemeydeCount + hazirlaniyorCount + yoldaCount;

    // Sağlık sinyalleri
    const daysSinceLast = sonTir ? Math.max(0, Math.floor((Date.now() - new Date(sonTir.varis_tarihi || sonTir.created_at).getTime()) / 86400000)) : null;
    const latestAvgVar  = sonTir ? 0 : 0; // Variance hesabı dışarıda bırakıldı (mevcut rpc yok)

    const periodLabel = PERIOD_LABEL[period] ?? 'Bu Ay';

    // ── Kısa linkler ──────────────────────────────────────────────────────────
    const L = { locale };

    const apps = [
        {
            id: 'finans',
            title: 'Finansal Detay',
            icon: <FiPieChart />,
            colorClass: 'bg-blue-100 text-blue-700',
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Sol: P&L */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Gelir &amp; Maliyet — {periodLabel}</p>
                        <div className="space-y-0 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                            {[
                                { label: 'Net Ciro',              value: fmt(mtd?.totalRevenue),  cls: 'text-slate-800' },
                                { label: 'Satılan Mal Maliyeti',  value: fmt(mtd?.totalCogs),     cls: 'text-red-600' },
                                { label: 'Brüt Kâr',             value: fmt(mtd?.grossProfit),   cls: (mtd?.grossProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600', bold: true },
                                { label: 'Operasyonel Gider',     value: fmt(mtd?.totalExpenses), cls: 'text-slate-600' },
                                { label: 'Net Kâr',               value: fmt(mtd?.netProfit),     cls: (mtd?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600', bold: true, border: true },
                            ].map(r => (
                                <div key={r.label} className={`flex justify-between items-center px-4 py-2.5 ${r.border ? 'bg-slate-50' : ''}`}>
                                    <span className={`text-sm ${r.bold ? 'font-bold text-slate-700' : 'text-slate-600'}`}>{r.label}</span>
                                    <span className={`text-sm font-bold ${r.cls}`}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                        {prevMtd && deltaPct !== null && (
                            <p className="text-[11px] text-slate-400 mt-2 px-1">
                                Geçen ay net kâr: {fmt(prevMtd.netProfit)}
                                <span className={`ml-1.5 font-semibold ${deltaPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>({deltaPct >= 0 ? '+' : ''}{deltaPct}%)</span>
                            </p>
                        )}
                    </div>

                    {/* Sağ: Hedef Takip */}
                    <HedefTakipCard locale={locale} metrikler={[
                        { key: 'hedef_ciro',    label: 'Ciro Hedefi',      gercek: mtd?.totalRevenue ?? 0, hedef: hedefCiro,    format: 'currency' },
                        { key: 'hedef_musteri', label: 'Yeni Müşteri',     gercek: yeniMusteriCnt,          hedef: hedefMusteri, format: 'number' },
                        { key: 'hedef_temas',   label: 'Temas Edilen',     gercek: temasTotal,               hedef: hedefTemas,   format: 'number' },
                        { key: 'hedef_siparis', label: 'Teslim Edilen Sipariş', gercek: teslimEdilenCount, hedef: hedefSiparis, format: 'number' },
                    ]} />
                </div>
            )
        },
        {
            id: 'gorevler',
            title: 'Görev & Sipariş',
            icon: <FiCheckSquare />,
            colorClass: 'bg-orange-100 text-orange-700',
            badgeCount: overdueTasks.length + beklemeydeCount + iptalTalepCount,
            content: (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <SectionLink href={`/${locale}/admin/gorevler`}>Tüm görevler</SectionLink>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Sol: Görevler */}
                        <GorevDurumWidget overdue={overdueTasks} upcoming={upcomingTasks} myTasks={myTasks} locale={locale} />

                        {/* Sağ: Siparişler + TIR */}
                        <div className="space-y-3">
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Sipariş Durumu ({periodLabel})
                                    </p>
                                    <Link
                                        href={`/${locale}/admin/operasyon/siparisler`}
                                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                                    >
                                        Tümü <FiExternalLink size={9} />
                                    </Link>
                                </div>
                                {toplamSiparisCount === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-3">
                                        Bu dönem sipariş bulunmuyor.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: 'Beklemede',    val: beklemeydeCount,   cls: 'bg-amber-50 text-amber-700 border-amber-200',    href: `/${locale}/admin/operasyon/siparisler?durum=Beklemede` },
                                                { label: 'Hazırlanıyor', val: hazirlaniyorCount, cls: 'bg-blue-50 text-blue-700 border-blue-200',        href: `/${locale}/admin/operasyon/siparisler?durum=Hazırlanıyor` },
                                                { label: 'Yolda',        val: yoldaCount,        cls: 'bg-violet-50 text-violet-700 border-violet-200',  href: `/${locale}/admin/operasyon/siparisler?durum=Yola Çıktı` },
                                                { label: 'Teslim',       val: teslimEdilenCount, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', href: `/${locale}/admin/operasyon/siparisler?durum=Teslim Edildi` },
                                            ].map(s => (
                                                <Link key={s.label} href={s.href}
                                                    className={`rounded-lg border px-2.5 py-2 text-center hover:opacity-80 transition-opacity ${s.cls}`}>
                                                    <p className="text-lg font-bold">{s.val}</p>
                                                    <p className="text-[10px] font-semibold">{s.label}</p>
                                                </Link>
                                            ))}
                                        </div>
                                        {iptalTalepCount > 0 && (
                                            <Link
                                                href={`/${locale}/admin/operasyon/siparisler?durum=iptal_talep_edildi`}
                                                className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                                                    <FiAlertCircle size={12} />
                                                    İptal talebi
                                                </span>
                                                <span className="text-sm font-bold text-red-700">{iptalTalepCount}</span>
                                            </Link>
                                        )}
                                        {iptalCount > 0 && (
                                            <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400">
                                                <span>İptal edilen</span>
                                                <span className="font-semibold">{iptalCount}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Son TIR Partileri</p>
                                {sonTirler.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-2">Henüz parti yok.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {sonTirler.map((b: any) => (
                                            <div key={b.id} className="flex items-center justify-between text-sm">
                                                <div>
                                                    <p className="font-semibold text-slate-700">{b.referans_kodu}</p>
                                                    <p className="text-[11px] text-slate-400">{formatDate(b.varis_tarihi || b.created_at, locale as any)}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.durum === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {b.durum || 'Taslak'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'stok',
            title: 'Stok & Hunisi',
            icon: <FiBox />,
            colorClass: 'bg-green-100 text-green-700',
            badgeCount: kritikStok > 0 ? kritikStok : 0,
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Sol: Stok */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <MiniCard label="Toplam Ürün" value={fmtNum(urunToplamCount)} />
                            <MiniCard label="Kritik Stok" value={fmtNum(kritikStok)} warn={kritikStok > 0} />
                            <MiniCard label="Stok Değeri" value={fmt(stokDegeri)} />
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Son TIR</p>
                                {sonTir ? (
                                    <div className="flex items-center gap-2">
                                        <FiTruck size={13} className="text-slate-400" />
                                        <span className="text-sm font-semibold text-slate-700">{sonTir.referans_kodu}</span>
                                        <span className="text-xs text-slate-400">{formatDate(sonTir.varis_tarihi || sonTir.created_at, locale as any)}</span>
                                    </div>
                                ) : <p className="text-sm text-slate-400">Kayıt yok</p>}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sonraki TIR</p>
                                {yaklasenTir ? (
                                    <div className="flex items-center gap-2">
                                        <FiCalendar size={13} className="text-blue-400" />
                                        <span className="text-sm font-semibold text-slate-700">{yaklasenTir.referans_kodu}</span>
                                        <span className="text-xs text-slate-400">{formatDate(yaklasenTir.varis_tarihi, locale as any)}</span>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-semibold rounded-full">Planlanmadı</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: Satış Hunisi */}
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Satış Hunisi</p>
                        {[
                            { label: 'Aday',    count: adayCount,    color: 'bg-slate-300' },
                            { label: 'Temas',   count: temasTotal,   color: 'bg-blue-400' },
                            { label: 'Müşteri', count: musteriCount, color: 'bg-emerald-500' },
                        ].map(row => {
                            const pct = toplamFunnel > 0 ? Math.round(row.count / toplamFunnel * 100) : 0;
                            return (
                                <div key={row.label}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-slate-600 font-medium">{row.label}</span>
                                        <span className="font-bold text-slate-800">{row.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {yeniTemasCount > 0 && (
                            <p className="text-[11px] text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                                Bu hafta <strong>{yeniTemasCount} yeni temas</strong> oluşturuldu.
                            </p>
                        )}
                        <Link href={`/${locale}/admin/crm/firmalar`} className="text-xs text-blue-600 hover:underline">CRM → Firma listesi</Link>
                    </div>
                </div>
            )
        },
        {
            id: 'musteri',
            title: 'Müşteriler',
            icon: <FiUsers />,
            colorClass: 'bg-purple-100 text-purple-700',
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CustomerOverview />
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-3">Alt Bayiler</p>
                        <DistributorsList locale={locale} dictionary={dictionary} cookieStore={cookieStore} />
                    </div>
                </div>
            )
        },
        {
            id: 'fiyat-saglik',
            title: 'Fiyat Sağlığı',
            icon: <FiActivity />,
            colorClass: 'bg-cyan-100 text-cyan-700',
            content: (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 justify-end">
                        <SectionLink href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`}>Fiyatlandırma merkezi</SectionLink>
                        <SectionLink href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}>Detaylı rapor</SectionLink>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <HealthCard title="Marj riski olan ürün" value={`${alarmCount} ürün`}
                            hint={alarmCount === 0 ? 'Tüm ürünler marj eşiği içinde.' : 'Satış marjını baskılayan ürünler var.'}
                            tag={alarmCount === 0 ? 'İyi' : 'Acil'} tagColor={alarmCount === 0 ? 'green' : 'red'} />
                        <HealthCard title="Son partide maliyet farkı" value={sonTir ? (sonTir.referans_kodu || 'Kayıt var') : 'Kayıt yok'}
                            hint={sonTir ? `${formatDate(sonTir.varis_tarihi || sonTir.created_at, locale as any)} · ${sonTir.durum || 'Taslak'}` : 'Henüz parti kaydı yok.'}
                            tag={sonTir ? 'İyi' : 'Veri yok'} tagColor={sonTir ? 'green' : 'yellow'} />
                        <HealthCard title="Parti verisi güncelliği" value={daysSinceLast === null ? 'Kayıt yok' : `${daysSinceLast} gün`}
                            hint={daysSinceLast === null ? 'Henüz parti kaydı yok.' : daysSinceLast <= 7 ? 'Güncel veri mevcut.' : 'Parti verisi eskimiş olabilir.'}
                            tag={daysSinceLast === null ? 'Veri yok' : daysSinceLast <= 7 ? 'İyi' : daysSinceLast <= 21 ? 'Dikkat' : 'Acil'}
                            tagColor={daysSinceLast === null ? 'yellow' : daysSinceLast <= 7 ? 'green' : 'red'} />
                        <HealthCard title="Kritik stokta ürün" value={`${kritikStok} ürün`}
                            hint={kritikStok === 0 ? 'Kritik stok görünmüyor.' : 'Tedarik planı gözden geçirilmeli.'}
                            tag={kritikStok === 0 ? 'İyi' : kritikStok <= 5 ? 'Dikkat' : 'Acil'}
                            tagColor={kritikStok === 0 ? 'green' : kritikStok <= 5 ? 'yellow' : 'red'} />
                    </div>
                </div>
            )
        },
        {
            id: 'fiyat-alarm',
            title: 'Fiyat Alarmları',
            icon: <FiBell />,
            colorClass: 'bg-rose-100 text-rose-700',
            badgeCount: alarmCount > 0 ? alarmCount : 0,
            content: (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <SectionLink href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}>Detaylı rapor</SectionLink>
                    </div>
                    {alarmCount === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FiCheckCircle size={18} className="text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Aktif fiyat alarmı yok</p>
                            <p className="text-xs text-slate-400 mt-0.5">Tüm ürünler marj eşiği içinde.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="mb-3 px-3 py-2.5 bg-rose-50 rounded-lg border border-rose-100">
                                <p className="text-sm font-semibold text-rose-700">
                                    {alarmCount} ürün marj riski
                                    <span className="ml-2 font-normal text-rose-500">· Ort. sapma %{alarmOrt.toFixed(1)}</span>
                                </p>
                            </div>
                            {alarmUrunler.map((p: any) => {
                                const variance = Math.abs(Number(p.son_maliyet_sapma_yuzde || 0));
                                const ad = typeof p.ad === 'object' ? (p.ad?.[locale] || p.ad?.de || p.ad?.tr || 'Ürün') : (p.ad || 'Ürün');
                                return (
                                    <Link key={p.id} href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
                                        className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-slate-100 hover:bg-slate-50 group transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 group-hover:text-rose-700 transition-colors">{ad}</p>
                                            <p className="text-xs text-slate-400">{p.stok_kodu || '—'}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${variance >= 15 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            %{Math.round(variance)}
                                        </span>
                                    </Link>
                                );
                            })}
                            <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="block text-center text-xs text-blue-600 hover:underline pt-2">
                                + Tüm alarmları gör →
                            </Link>
                        </div>
                    )}
                </div>
            )
        }
    ];

    return (
        <AnimatedDashboardContainer>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">CEO Cockpit</h1>
                    <p className="text-sm text-slate-500">{periodLabel} · {new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <Suspense fallback={<div className="h-9 w-56 bg-slate-100 rounded-xl animate-pulse" />}>
                    <DashboardPeriodTabs />
                </Suspense>
            </div>

            {/* ── Quick Stats Bar (6 kart) ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                    { label: 'Net Ciro',      value: <AnimatedNumber value={mtd?.totalRevenue ?? 0} format="currency" />,   bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', text: 'text-blue-800',  sub: deltaPct !== null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}% geçen ay` : '', href: null },
                    { label: 'Brüt Kâr',      value: <AnimatedNumber value={mtd?.grossProfit ?? 0} format="currency" />,    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50', text: 'text-green-800', sub: '', href: null },
                    { label: 'Toplam Gider',  value: <AnimatedNumber value={mtd?.totalExpenses ?? 0} format="currency" />,  bg: 'bg-gradient-to-br from-orange-50 to-amber-100/50', text: 'text-orange-800',sub: '', href: null },
                    { label: 'Net Kâr',       value: <AnimatedNumber value={mtd?.netProfit ?? 0} format="currency" />,      bg: 'bg-gradient-to-br from-rose-50 to-red-100/50', text: (mtd?.netProfit ?? 0) >= 0 ? 'text-green-800' : 'text-red-700', sub: '', href: null },
                    {
                        label: 'Teslim Edilen',
                        value: String(teslimEdilenCount),
                        bg: 'bg-[#EAF3DE]',
                        text: 'text-emerald-800',
                        sub: `${periodLabel} · gerçekleşen`,
                        href: `/${locale}/admin/operasyon/siparisler?durum=Teslim Edildi`,
                    },
                    {
                        label: 'Aktif Sipariş',
                        value: <AnimatedNumber value={aktifSiparisCount} />,
                        bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
                        text: aktifSiparisCount > 0 ? 'text-blue-700' : 'text-slate-800',
                        sub: `${beklemeydeCount} bekl. · ${hazirlaniyorCount} hazır · ${yoldaCount} yolda`,
                        href: `/${locale}/admin/operasyon/siparisler`,
                    },
                ].map((c, i) => (
                    <AnimatedCard key={c.label}>
                        <Link
                            href={c.href ?? '#'}
                            className={`rounded-2xl border border-slate-200/50 px-4 py-3.5 ${c.bg} backdrop-blur-sm
                                hover:shadow-lg transition-all block h-full`}
                        >
                            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
                            <p className="text-[12px] font-medium text-slate-600 mt-0.5">{c.label}</p>
                            {c.sub && <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>}
                        </Link>
                    </AnimatedCard>
                ))}
            </div>

            {/* ── Urgent Alerts ─────────────────────────────────────────── */}
            {(iptalTalepCount > 0 || beklemeydeCount > 0 || kritikStok > 0) && (
                <div className="flex flex-wrap gap-2">
                    {iptalTalepCount > 0 && (
                        <Link
                            href={`/${locale}/admin/operasyon/siparisler?durum=iptal_talep_edildi`}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                        >
                            <FiAlertCircle size={15} />
                            {iptalTalepCount} iptal talebi bekliyor
                        </Link>
                    )}
                    {beklemeydeCount > 0 && (
                        <Link
                            href={`/${locale}/admin/operasyon/siparisler?durum=Beklemede`}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                            <FiPackage size={15} />
                            {beklemeydeCount} sipariş onay bekliyor
                        </Link>
                    )}
                    {kritikStok > 0 && (
                        <Link
                            href={`/${locale}/admin/urun-yonetimi/urunler?filtre=kritik-stok`}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                            <FiAlertTriangle size={15} />
                            {kritikStok} ürün kritik stokta
                        </Link>
                    )}
                </div>
            )}

            {/* ── Nakit & Sermaye ───────────────────────────────────────── */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Nakit &amp; Sermaye</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KasaKalanCard initialValue={kasaBakiyesi} locale={locale} />
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{periodLabel} Gider</p>
                        <p className="text-2xl font-bold text-slate-800"><AnimatedNumber value={mtd?.totalExpenses ?? 0} format="currency" /></p>
                        <p className="text-[11px] text-slate-400 mt-0.5">SMM dahil değil</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Depodaki Stok Değeri</p>
                        <p className="text-2xl font-bold text-slate-800"><AnimatedNumber value={stokDegeri ?? 0} format="currency" /></p>
                        <p className="text-[11px] text-slate-400 mt-0.5"><AnimatedNumber value={urunToplamCount} /> ürün (toplam) · alış fiyatı</p>
                    </div>
                </div>
            </div>

            {/* ── Hızlı İşlemler ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Hızlı İşlemler</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Yeni Firma',    icon: <FiUsers size={16} />,    href: `/${locale}/admin/crm/firmalar/yeni`,                    bg: 'bg-blue-100 text-blue-700' },
                        { label: 'Yeni Ürün',     icon: <FiArchive size={16} />,  href: `/${locale}/admin/urun-yonetimi/urunler/yeni`,            bg: 'bg-green-100 text-green-700' },
                        { label: 'Yeni Sipariş',  icon: <FiPackage size={16} />,  href: `/${locale}/admin/operasyon/siparisler/yeni`,             bg: 'bg-orange-100 text-orange-700' },
                        { label: 'Yeni Gider',    icon: <FiBriefcase size={16} />,href: `/${locale}/admin/idari/finans/giderler`,                 bg: 'bg-purple-100 text-purple-700' },
                        { label: 'Kasa İşlemi',   icon: <FiDollarSign size={16} />,href: `/${locale}/admin/idari/finans/kasa`,                     bg: 'bg-emerald-100 text-emerald-700' },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700 group min-h-[40px]">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-105 transition-transform`}>{a.icon}</span>
                            {a.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── App Grid (Uygulama Modülleri) ─────────────────────────── */}
            <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Yönetim Modülleri</p>
                <CockpitAppGrid apps={apps} />
            </div>

        </AnimatedDashboardContainer>
    );
}

// ── Giriş noktası ─────────────────────────────────────────────────────────────

export default async function AdminDashboardPage({
    params,
    searchParams,
}: {
    params: { locale: Locale };
    searchParams?: { period?: string };
}) {
    noStore();
    const locale     = await Promise.resolve(params).then(p => p.locale);
    const period     = searchParams?.period ?? 'bu-ay';
    const dictionary = await getDictionary(locale);

    const cookieStore = await cookies();
    const supabase    = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return <div className="p-8 text-center text-red-500">Kullanıcı bulunamadı.</div>;

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!profile) return <div className="p-8 text-center text-red-500">Profil bulunamadı.</div>;

    const role = profile.rol;
    if (role !== 'Yönetici' && role !== 'Personel' && role !== 'Ekip Üyesi') {
        return <div className="p-8 text-center text-red-500">Yetkilendirme hatası.</div>;
    }

    return (
        <div className="space-y-4">
            {role === 'Yönetici' && (
                <ManagerDashboard locale={locale} period={period} dictionary={dictionary} cookieStore={cookieStore} userId={user.id} />
            )}
            {(role === 'Personel' || role === 'Ekip Üyesi') && (
                <>
                    <header>
                        <h1 className="text-2xl font-bold text-slate-900">Hoş geldiniz</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Bugün: {new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </header>
                    <TeamMemberDashboard userId={user.id} locale={locale} dictionary={dictionary} cookieStore={cookieStore} />
                </>
            )}
        </div>
    );
}
