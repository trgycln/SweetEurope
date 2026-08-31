// src/components/portal/dashboard/BayiCockpit.tsx
// Alt Bayi için CEO Cockpit — Modern & Dinamik Yönetim Paneli

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { HedefDuzenleButton } from './HedefDuzenleButton';
import {
    FiUsers, FiPackage, FiClipboard, FiTrendingUp, FiTrendingDown,
    FiTarget, FiCheckCircle, FiAlertCircle, FiPlus, FiDollarSign,
    FiCalendar, FiBox, FiArchive, FiExternalLink, FiPlay,
    FiPieChart, FiCheckSquare, FiActivity, FiBell, FiTruck, FiShoppingBag
} from 'react-icons/fi';
import { AnimatedDashboardContainer, AnimatedCard } from '@/components/admin/dashboard/AnimatedDashboardWrapper';
import { AnimatedNumber } from '@/components/admin/dashboard/AnimatedNumber';
import DashboardPeriodTabs from '@/components/admin/dashboard/DashboardPeriodTabs';
import CockpitAppGrid from '@/components/admin/dashboard/CockpitAppGrid';
import GorevDurumWidget from '@/components/admin/dashboard/GorevDurumWidget';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtNum = (v: number | null | undefined) =>
    new Intl.NumberFormat('tr-TR').format(v ?? 0);

function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPeriodDates(period: string, now: Date) {
    const y = now.getFullYear();
    const mo = now.getMonth();
    if (period === 'gecen-ay') return { start: toLocalDate(new Date(y, mo - 1, 1)), end: toLocalDate(new Date(y, mo, 0)) };
    if (period === 'bu-yil')   return { start: toLocalDate(new Date(y, 0, 1)),       end: toLocalDate(now) };
    return { start: toLocalDate(new Date(y, mo, 1)), end: toLocalDate(now) };
}

const PERIOD_LABEL: Record<string, string> = {
    'bu-ay': 'Bu Ay (MTD)',
    'gecen-ay': 'Geçen Ay',
    'bu-yil': 'Bu Yıl (YTD)'
};

const STATUS_CHIP: Record<string, string> = {
    'Beklemede': 'bg-amber-50 text-amber-700 border-amber-200',
    'Hazırlanıyor': 'bg-blue-50 text-blue-700 border-blue-200',
    'Yola Çıktı': 'bg-violet-50 text-violet-700 border-violet-200',
    'shipped': 'bg-violet-50 text-violet-700 border-violet-200',
    'Teslim Edildi': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'processing': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'İptal Edildi': 'bg-red-50 text-red-700 border-red-200',
    'cancelled': 'bg-red-50 text-red-700 border-red-200',
    'iptal_talep_edildi': 'bg-amber-50 text-amber-700 border-amber-200',
    'İptal Talep Edildi': 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_LABEL: Record<string, string> = {
    'Beklemede': 'Beklemede',
    'Hazırlanıyor': 'Hazırlanıyor',
    'Yola Çıktı': 'Yolda',
    'shipped': 'Yolda',
    'Teslim Edildi': 'Teslim',
    'delivered': 'Teslim',
    'processing': 'İşlemde',
    'İptal Edildi': 'İptal',
    'cancelled': 'İptal',
    'iptal_talep_edildi': 'İptal Talep',
    'İptal Talep Edildi': 'İptal Talep',
};

function MiniCard({ label, value, warn }: { label: string; value: string | React.ReactNode; warn?: boolean }) {
    return (
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-center">
            <p className={`text-2xl font-bold ${warn ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
        </div>
    );
}

interface Props {
    userId: string;
    firmaId: string;
    locale: string;
    firmaUnvan: string;
    period?: string;
}

export default async function BayiCockpit({ userId, firmaId, locale, firmaUnvan, period = 'bu-ay' }: Props) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const now = new Date();
    const { start: periodStart, end: periodEnd } = getPeriodDates(period, now);
    const prevPeriodStart = toLocalDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevPeriodEnd = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const todayISO = now.toISOString();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString();

    const OPEN_STATUSES = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];

    // ── 1. Alt bayiye bağlı müşteri firmalarını çek ─────────────────────────────
    const { data: myCustomers } = await supabase
        .from('firmalar')
        .select('id, status, created_at, unvan')
        .neq('id', firmaId)
        .not('kategori', 'eq', 'Alt Bayi')
        .or(`ust_bayi_firma_id.eq.${firmaId},sahip_id.eq.${userId}`);

    const customerList = myCustomers ?? [];
    const myCustomerIds = customerList.map((c: any) => c.id);

    const aday = customerList.filter((c: any) => (c.status || '').toUpperCase() === 'ADAY').length;
    const temas = customerList.filter((c: any) => ['TEMAS EDİLDİ', 'NUMUNE VERİLDİ'].includes((c.status || '').toUpperCase())).length;
    const aktifMusteri = customerList.filter((c: any) => ['MÜŞTERİ', 'MUSTERI'].includes((c.status || '').toUpperCase())).length;
    const toplamFunnel = aday + temas + aktifMusteri;

    const yeniMusteriBuDonem = customerList.filter((c: any) =>
        c.created_at && c.created_at >= `${periodStart}T00:00:00` && ['MÜŞTERİ', 'MUSTERI'].includes((c.status || '').toUpperCase())
    ).length;

    // ── 2. Paralel Veri Sorguları ───────────────────────────────────────────────
    let taskOrFilters = `atanan_kisi_id.eq.${userId},sahip_id.eq.${userId},olusturan_kisi_id.eq.${userId}`;
    if (myCustomerIds.length > 0) {
        taskOrFilters += `,ilgili_firma_id.in.(${myCustomerIds.join(',')})`;
    }

    const [
        kendiSiparisAcikRes,        // Bizden bekleyen kendi siparişlerimiz (Merkeze verilen)
        musteriSiparisBuDonemRes,   // Müşterilerimin siparişleri - bu dönem
        musteriSiparisGecenDonemRes,// Müşterilerimin siparişleri - geçen dönem
        musteriSiparisDurumRes,     // Müşterilerimin sipariş durum dağılımı
        gecenSiparislerimRes,       // Son müşteri siparişleri
        gorevAcikRes,               // Açık görevler (kendim + müşterilerim)
        gorevGecikenRes,            // Geciken görevler
        gorevYaklasanRes,           // Yaklaşan görevler
        gorevlerimRes,              // Sadece bana atanan görevler
        bekleyenTalepRes,           // Bekleyen numune / talepler
        hedeflerRes,                // Bayi hedefleri
    ] = await Promise.all([
        supabase.from('siparisler')
            .select('id', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('siparis_durumu', OPEN_STATUSES),

        myCustomerIds.length > 0
            ? supabase.from('siparisler')
                .select('id, toplam_tutar_net, siparis_durumu, created_at, firma_id')
                .in('firma_id', myCustomerIds)
                .gte('siparis_tarihi', periodStart)
                .lte('siparis_tarihi', periodEnd)
            : Promise.resolve({ data: [], error: null }),

        myCustomerIds.length > 0
            ? supabase.from('siparisler')
                .select('toplam_tutar_net')
                .in('firma_id', myCustomerIds)
                .gte('siparis_tarihi', prevPeriodStart)
                .lte('siparis_tarihi', prevPeriodEnd)
            : Promise.resolve({ data: [], error: null }),

        myCustomerIds.length > 0
            ? supabase.from('siparisler')
                .select('siparis_durumu')
                .in('firma_id', myCustomerIds)
                .gte('created_at', new Date(now.getTime() - 60 * 86400000).toISOString())
            : Promise.resolve({ data: [], error: null }),

        myCustomerIds.length > 0
            ? (supabase as any).from('siparisler')
                .select('id, siparis_durumu, toplam_tutar_net, siparis_tarihi, firma_id, firmalar(unvan)')
                .in('firma_id', myCustomerIds)
                .order('created_at', { ascending: false })
                .limit(6)
            : Promise.resolve({ data: [], error: null }),

        supabase.from('gorevler')
            .select('id', { count: 'exact', head: true })
            .or(taskOrFilters)
            .eq('tamamlandi', false),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik, atanan_kisi_id')
            .or(taskOrFilters)
            .eq('tamamlandi', false)
            .lt('son_tarih', todayISO)
            .order('son_tarih', { ascending: true })
            .limit(8),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik, atanan_kisi_id')
            .or(taskOrFilters)
            .eq('tamamlandi', false)
            .gte('son_tarih', todayISO)
            .lte('son_tarih', thirtyDaysLater)
            .order('son_tarih', { ascending: true })
            .limit(8),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik, atanan_kisi_id')
            .eq('atanan_kisi_id', userId)
            .eq('tamamlandi', false)
            .order('son_tarih', { ascending: true, nullsFirst: false })
            .limit(8),

        (supabase as any).from('sample_requests')
            .select('id', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('status', ['Beklemede', 'pending', 'İncelemede']),

        (supabase as any).from('bayi_hedefleri')
            .select('hedef_ciro, hedef_musteri, hedef_siparis')
            .eq('firma_id', firmaId)
            .maybeSingle(),
    ]);

    // ── 3. Hesaplamalar & Metrikler ────────────────────────────────────────────
    const buDonemSiparisler = (musteriSiparisBuDonemRes.data ?? []) as any[];
    const gecenDonemSiparisler = (musteriSiparisGecenDonemRes.data ?? []) as any[];

    const buDonemCiro = buDonemSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const gecenDonemCiro = gecenDonemSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const ciroDelta = gecenDonemCiro > 0 ? Math.round(((buDonemCiro - gecenDonemCiro) / gecenDonemCiro) * 100) : null;

    const buDonemSiparisAdedi = buDonemSiparisler.length;
    // Bayi için tahmini marj (~%35 brüt kâr oranı referansı)
    const tahminiBrutKar = buDonemCiro * 0.35;
    const ortalamaSepetTutari = buDonemSiparisAdedi > 0 ? buDonemCiro / buDonemSiparisAdedi : 0;

    const sipDag = (musteriSiparisDurumRes.data ?? []) as any[];
    const sipCount = (statuses: string[]) => sipDag.filter(d => statuses.includes(d.siparis_durumu)).length;

    const teslimEdilenCount = sipCount(['Teslim Edildi', 'delivered']);
    const beklemeydeCount   = sipCount(['Beklemede']);
    const hazirlaniyorCount = sipCount(['Hazırlanıyor', 'processing']);
    const yoldaCount        = sipCount(['Yola Çıktı', 'shipped']);
    const iptalTalepCount   = sipCount(['iptal_talep_edildi', 'İptal Talep Edildi']);
    const aktifMusteriSiparisCount = beklemeydeCount + hazirlaniyorCount + yoldaCount;

    const kendiAcikSiparis = kendiSiparisAcikRes.count ?? 0;
    const gorevAcik = gorevAcikRes.count ?? 0;
    const bekleyenTalep = bekleyenTalepRes.count ?? 0;
    const sonSiparisler = (gecenSiparislerimRes.data ?? []) as any[];

    const mapTask = (t: any) => ({
        id: t.id,
        baslik: t.baslik,
        son_tarih: t.son_tarih,
        oncelik: t.oncelik ?? null,
        atanan_kisi_adi: null
    });

    const overdueTasks  = (gorevGecikenRes.data  || []).map(mapTask);
    const upcomingTasks = (gorevYaklasanRes.data || []).map(mapTask);
    const myTasks       = (gorevlerimRes.data     || []).map(mapTask);

    // Hedefler
    const hedeflerRow = (hedeflerRes as any)?.data ?? null;
    const hedefCiro = Number(hedeflerRow?.hedef_ciro ?? 15000);
    const hedefMusteri = Number(hedeflerRow?.hedef_musteri ?? 4);
    const hedefSiparis = Number(hedeflerRow?.hedef_siparis ?? 15);

    const ciroPct = Math.min(100, Math.round((buDonemCiro / hedefCiro) * 100));
    const musteriPct = Math.min(100, Math.round((yeniMusteriBuDonem / hedefMusteri) * 100));
    const siparisPct = Math.min(100, Math.round((buDonemSiparisAdedi / hedefSiparis) * 100));

    const periodLabel = PERIOD_LABEL[period] ?? 'Bu Ay';

    // ── 4. Cockpit App Grid Modülleri ──────────────────────────────────────────
    const apps = [
        {
            id: 'finans-hedef',
            title: 'Finans & Hedefler',
            icon: <FiPieChart />,
            colorClass: 'bg-blue-100 text-blue-700',
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Sol: Gelir Tablosu */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Satış &amp; Kazanç Özeti — {periodLabel}</p>
                        <div className="space-y-0 divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                            {[
                                { label: 'Müşteri Satış Cirosu',      value: fmt(buDonemCiro),       cls: 'text-slate-900', bold: true },
                                { label: 'Tahmini Ürün Alış Maliyeti', value: fmt(buDonemCiro * 0.65), cls: 'text-slate-600' },
                                { label: 'Tahmini Brüt Kâr',          value: fmt(tahminiBrutKar),    cls: 'text-emerald-700', bold: true, border: true },
                                { label: 'Ortalama Sepet Tutarı',     value: fmt(ortalamaSepetTutari), cls: 'text-blue-700' },
                                { label: 'Toplam Müşteri Sipariş Sayısı', value: `${buDonemSiparisAdedi} adet`, cls: 'text-slate-800' },
                            ].map(r => (
                                <div key={r.label} className={`flex justify-between items-center px-4 py-3 ${r.border ? 'bg-emerald-50/50' : ''}`}>
                                    <span className={`text-sm ${r.bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{r.label}</span>
                                    <span className={`text-sm font-bold ${r.cls}`}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                        {gecenDonemCiro > 0 && ciroDelta !== null && (
                            <p className="text-xs text-slate-500 mt-2.5 px-1 font-medium">
                                Geçen dönem ciro: <strong className="text-slate-700">{fmt(gecenDonemCiro)}</strong>
                                <span className={`ml-2 font-bold ${ciroDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    ({ciroDelta >= 0 ? '+' : ''}{ciroDelta}%)
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Sağ: Hedef Takip */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <FiTarget size={16} className="text-blue-600" /> Hedef Takibi ({periodLabel})
                                </p>
                                <HedefDuzenleButton
                                    firmaId={firmaId}
                                    locale={locale}
                                    hedefCiro={hedefCiro}
                                    hedefMusteri={hedefMusteri}
                                    hedefSiparis={hedefSiparis}
                                />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Ciro Hedefi', current: fmt(buDonemCiro), target: fmt(hedefCiro), pct: ciroPct },
                                    { label: 'Yeni Müşteri Hedefi', current: String(yeniMusteriBuDonem), target: String(hedefMusteri), pct: musteriPct },
                                    { label: 'Sipariş Adedi Hedefi', current: String(buDonemSiparisAdedi), target: String(hedefSiparis), pct: siparisPct },
                                ].map(h => (
                                    <div key={h.label}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-700">{h.label}</span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                <strong className="text-slate-900 font-bold">{h.current}</strong> / {h.target}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${h.pct >= 100 ? 'bg-emerald-500' : h.pct >= 60 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                                style={{ width: `${h.pct}%` }} />
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1 text-right font-medium">
                                            {h.pct >= 100 ? '🎯 Hedefe ulaşıldı!' : `%${h.pct} tamamlandı`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'gorev-siparis',
            title: 'Görev & Sipariş',
            icon: <FiCheckSquare />,
            colorClass: 'bg-orange-100 text-orange-700',
            badgeCount: overdueTasks.length + beklemeydeCount + iptalTalepCount,
            content: (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Link href={`/${locale}/portal/gorevlerim`} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                            Tüm görevleri aç <FiExternalLink size={11} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Sol: Görev Durum Widget */}
                        <GorevDurumWidget overdue={overdueTasks} upcoming={upcomingTasks} myTasks={myTasks} locale={locale} />

                        {/* Sağ: Müşteri Sipariş Durumu */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-3.5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Müşteri Sipariş Durumu (Son 60 gün)
                                    </p>
                                    <Link
                                        href={`/${locale}/portal/siparisler`}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                                    >
                                        Tümü <FiExternalLink size={10} />
                                    </Link>
                                </div>
                                {sipDag.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">Bu dönem müşteri siparişi yok.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {[
                                                { label: 'Beklemede',    val: beklemeydeCount,   cls: 'bg-amber-50 text-amber-800 border-amber-200' },
                                                { label: 'Hazırlanıyor', val: hazirlaniyorCount, cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                                                { label: 'Yolda',        val: yoldaCount,        cls: 'bg-violet-50 text-violet-800 border-violet-200' },
                                                { label: 'Teslim Edildi',val: teslimEdilenCount, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                                            ].map(s => (
                                                <div key={s.label} className={`rounded-xl border px-3 py-2.5 text-center ${s.cls}`}>
                                                    <p className="text-xl font-bold">{s.val}</p>
                                                    <p className="text-[11px] font-semibold mt-0.5">{s.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Son Siparişler Listesi */}
                            {sonSiparisler.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Son Sipariş Hareketleri</p>
                                    {sonSiparisler.slice(0, 4).map((s: any) => (
                                        <Link key={s.id} href={`/${locale}/portal/musterilerim/${s.firma_id}/siparisler`}
                                            className="flex items-center justify-between text-xs py-2 hover:bg-slate-50 rounded-xl transition-colors px-2.5 border border-transparent hover:border-slate-200">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{s.firmalar?.unvan || 'Müşteri'}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{new Date(s.siparis_tarihi).toLocaleDateString(locale)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_CHIP[s.siparis_durumu] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    {STATUS_LABEL[s.siparis_durumu] ?? s.siparis_durumu}
                                                </span>
                                                <span className="font-extrabold text-slate-900">{fmt(s.toplam_tutar_net)}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'musteri-crm',
            title: 'Müşteri & Portföy',
            icon: <FiUsers />,
            colorClass: 'bg-purple-100 text-purple-700',
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Sol: Müşteri Satış Hunisi */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FiUsers size={16} className="text-purple-600" /> Müşteri Hunisi &amp; CRM
                            </p>
                            <Link href={`/${locale}/portal/musterilerim`} className="text-xs text-blue-600 hover:underline font-bold">
                                Tüm Müşteriler →
                            </Link>
                        </div>
                        {toplamFunnel === 0 ? (
                            <div className="py-8 text-center">
                                <div className="text-3xl mb-2">👥</div>
                                <p className="text-sm text-slate-500 font-medium">Henüz kayıtlı müşteri bulunmuyor.</p>
                                <Link href={`/${locale}/portal/musterilerim/yeni`}
                                    className="mt-3 inline-block text-xs px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-xs">
                                    + İlk Müşterini Ekle
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {[
                                    { label: 'Aday İşletmeler', count: aday, color: 'bg-slate-300', textColor: 'text-slate-700' },
                                    { label: 'Temas / Numune Verildi', count: temas, color: 'bg-blue-500', textColor: 'text-blue-700' },
                                    { label: 'Aktif Satın Alan Müşteri', count: aktifMusteri, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                                ].map(row => {
                                    const pct = toplamFunnel > 0 ? Math.round((row.count / toplamFunnel) * 100) : 0;
                                    return (
                                        <div key={row.label}>
                                            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                                                <span className="text-slate-700">{row.label}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-bold ${row.textColor}`}>{row.count}</span>
                                                    <span className="text-[11px] text-slate-400">(%{pct})</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${row.color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-slate-500 pt-3 border-t border-slate-100 text-center font-medium">
                                    Bölgenizde toplam <strong className="text-slate-900">{toplamFunnel}</strong> işletme · <strong className="text-emerald-700">{aktifMusteri}</strong> aktif müşteri
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sağ: Müşteri Aksiyonları */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Müşteri Portföy Özeti</p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <MiniCard label="Yeni Müşteri (Bu Dönem)" value={yeniMusteriBuDonem} />
                                <MiniCard label="Aktif Müşteri Oranı" value={toplamFunnel > 0 ? `%${Math.round((aktifMusteri / toplamFunnel) * 100)}` : '—'} />
                            </div>
                        </div>
                        <Link href={`/${locale}/portal/musterilerim/yeni`}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold text-center hover:bg-slate-800 transition-colors shadow-xs">
                            + Yeni Müşteri Kaydı Aç
                        </Link>
                    </div>
                </div>
            )
        },
        {
            id: 'katalog',
            title: 'Ürün Kataloğu',
            icon: <FiShoppingBag />,
            colorClass: 'bg-emerald-100 text-emerald-700',
            content: (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                        <FiShoppingBag />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Sweet Heaven Ürün Kataloğu &amp; Fiyatlar</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            Tüm pasta, tatlı ve dondurulmuş lezzet kategorilerini inceleyin, bayiye özel fiyatlarla hızlı sipariş oluşturun.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <Link href={`/${locale}/portal/katalog`}
                            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs">
                            Kataloğu Görüntüle
                        </Link>
                        <Link href={`/${locale}/portal/siparisler/yeni`}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs">
                            Hızlı Sipariş Ver
                        </Link>
                    </div>
                </div>
            )
        }
    ];

    return (
        <AnimatedDashboardContainer>
            {/* ── 1. Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>⚡</span> Bayi CEO Cockpit
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        {firmaUnvan} · {periodLabel} · {new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <Suspense fallback={<div className="h-10 w-56 bg-slate-100 rounded-2xl animate-pulse" />}>
                    <DashboardPeriodTabs />
                </Suspense>
            </div>

            {/* ── 2. Quick Stats Bar (6 KPI Kartı) ─────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                    {
                        label: 'Net Satış Cirosu',
                        value: <AnimatedNumber value={buDonemCiro} format="currency" />,
                        bg: 'bg-gradient-to-br from-blue-50 to-blue-100/60',
                        text: 'text-blue-900',
                        sub: ciroDelta !== null ? `${ciroDelta > 0 ? '+' : ''}${ciroDelta}% geçen dönem` : 'Dönem cirosu',
                        href: `/${locale}/portal/finanslarim`,
                    },
                    {
                        label: 'Tahmini Brüt Kâr',
                        value: <AnimatedNumber value={tahminiBrutKar} format="currency" />,
                        bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60',
                        text: 'text-emerald-900',
                        sub: 'Satış marjı ~%35',
                        href: `/${locale}/portal/finanslarim`,
                    },
                    {
                        label: 'Teslim Edilen',
                        value: String(teslimEdilenCount),
                        bg: 'bg-gradient-to-br from-teal-50 to-teal-100/60',
                        text: 'text-teal-900',
                        sub: `${teslimEdilenCount} müşteri siparişi`,
                        href: `/${locale}/portal/siparisler`,
                    },
                    {
                        label: 'Aktif Sipariş',
                        value: <AnimatedNumber value={aktifMusteriSiparisCount} />,
                        bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60',
                        text: aktifMusteriSiparisCount > 0 ? 'text-amber-900' : 'text-slate-700',
                        sub: `${beklemeydeCount} bekl. · ${hazirlaniyorCount} hazır · ${yoldaCount} yolda`,
                        href: `/${locale}/portal/siparisler`,
                    },
                    {
                        label: 'Aktif Müşteriler',
                        value: String(aktifMusteri),
                        bg: 'bg-gradient-to-br from-purple-50 to-purple-100/60',
                        text: 'text-purple-900',
                        sub: `${toplamFunnel} toplam temas`,
                        href: `/${locale}/portal/musterilerim`,
                    },
                    {
                        label: 'Açık Görevler',
                        value: String(gorevAcik),
                        bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60',
                        text: overdueTasks.length > 0 ? 'text-red-700' : 'text-slate-800',
                        sub: overdueTasks.length > 0 ? `${overdueTasks.length} gecikmiş görev` : 'Tüm görevler yolunda',
                        href: `/${locale}/portal/gorevlerim`,
                    },
                ].map((c) => (
                    <AnimatedCard key={c.label}>
                        <Link
                            href={c.href}
                            className={`rounded-3xl border border-slate-200/60 p-4 ${c.bg} backdrop-blur-sm
                                hover:shadow-lg transition-all block h-full flex flex-col justify-between`}
                        >
                            <div>
                                <p className={`text-xl sm:text-2xl font-extrabold ${c.text}`}>{c.value}</p>
                                <p className="text-[12px] font-bold text-slate-700 mt-1">{c.label}</p>
                            </div>
                            {c.sub && <p className="text-[10px] text-slate-500 font-semibold mt-2">{c.sub}</p>}
                        </Link>
                    </AnimatedCard>
                ))}
            </div>

            {/* ── 3. Urgent Alert Bannerları ────────────────────────────────── */}
            {(overdueTasks.length > 0 || beklemeydeCount > 0 || iptalTalepCount > 0 || kendiAcikSiparis > 0) && (
                <div className="flex flex-wrap gap-2.5">
                    {overdueTasks.length > 0 && (
                        <Link
                            href={`/${locale}/portal/gorevlerim?durum=acik`}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shadow-xs"
                        >
                            <FiAlertCircle size={15} className="text-red-600 flex-shrink-0" />
                            {overdueTasks.length} gecikmiş görev aksiyon bekliyor
                        </Link>
                    )}
                    {beklemeydeCount > 0 && (
                        <Link
                            href={`/${locale}/portal/siparisler`}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                        >
                            <FiPackage size={15} className="text-amber-600 flex-shrink-0" />
                            {beklemeydeCount} müşteri siparişi onay bekliyor
                        </Link>
                    )}
                    {kendiAcikSiparis > 0 && (
                        <Link
                            href={`/${locale}/portal/siparisler`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors shadow-xs"
                        >
                            <FiTruck size={15} className="text-blue-600 flex-shrink-0" />
                            Merkezden {kendiAcikSiparis} açık siparişimiz işlemde
                        </Link>
                    )}
                </div>
            )}

            {/* ── 4. Nakit & Finansal Performans ───────────────────────────── */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Finans &amp; Satış Hacmi</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{periodLabel} Satış Hacmi</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                            <AnimatedNumber value={buDonemCiro} format="currency" />
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Müşterilerden tahsil edilecek brüt tutar</p>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ortalama Müşteri Sepeti</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-blue-800">
                            <AnimatedNumber value={ortalamaSepetTutari} format="currency" />
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Sipariş başına ortalama satış değeri</p>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Hedef Gerçekleşme Oranı</p>
                        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
                            %{ciroPct}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Hedef: <strong>{fmt(hedefCiro)}</strong> · Kalan: <strong>{fmt(Math.max(0, hedefCiro - buDonemCiro))}</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 5. Hızlı İşlemler ────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3.5">Hızlı İşlemler &amp; Kısayollar</p>
                <div className="flex flex-wrap gap-2.5">
                    {[
                        { label: 'Yeni Müşteri Ekle', icon: <FiUsers size={16} />, href: `/${locale}/portal/musterilerim/yeni`, bg: 'bg-blue-100 text-blue-800' },
                        { label: 'Müşteri Siparişi Gir', icon: <FiPackage size={16} />, href: `/${locale}/portal/musterilerim`, bg: 'bg-orange-100 text-orange-800' },
                        { label: 'Kendi Siparişim', icon: <FiBox size={16} />, href: `/${locale}/portal/siparisler/yeni`, bg: 'bg-emerald-100 text-emerald-800' },
                        { label: 'Yeni Görev Planla', icon: <FiClipboard size={16} />, href: `/${locale}/portal/gorevlerim`, bg: 'bg-teal-100 text-teal-800' },
                        { label: 'Finanslar & Satışlar', icon: <FiDollarSign size={16} />, href: `/${locale}/portal/finanslarim`, bg: 'bg-purple-100 text-purple-800' },
                        { label: 'Ürün Kataloğu', icon: <FiShoppingBag size={16} />, href: `/${locale}/portal/katalog`, bg: 'bg-rose-100 text-rose-800' },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all text-xs sm:text-sm font-bold text-slate-800 group min-h-[44px]">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-110 transition-transform`}>{a.icon}</span>
                            {a.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── 6. Yönetim Modülleri (CockpitAppGrid) ──────────────────────── */}
            <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Yönetim Modülleri</p>
                <CockpitAppGrid apps={apps} />
            </div>

        </AnimatedDashboardContainer>
    );
}
