// src/components/portal/dashboard/BayiCockpit.tsx
// Alt Bayi için CEO Cockpit Lite

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { HedefDuzenleButton } from './HedefDuzenleButton';
import {
    FiUsers, FiPackage, FiClipboard, FiTrendingUp, FiTrendingDown,
    FiTarget, FiCheckCircle, FiAlertCircle, FiPlus, FiDollarSign,
    FiCalendar, FiBox, FiArchive, FiExternalLink, FiPlay,
} from 'react-icons/fi';

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtNum = (v: number | null | undefined) =>
    new Intl.NumberFormat('tr-TR').format(v ?? 0);

function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

interface Props {
    userId: string;
    firmaId: string;
    locale: string;
    firmaUnvan: string;
}

export default async function BayiCockpit({ userId, firmaId, locale, firmaUnvan }: Props) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const now = new Date();
    const periodStart = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const periodEnd = toLocalDate(now);
    const prevPeriodStart = toLocalDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevPeriodEnd = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const todayISO = now.toISOString();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString();

    const OPEN_STATUSES = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];

    // ── Önce kendi müşteri firmalarımı bul (sahip_id = userId)
    const { data: myCustomers } = await supabase
        .from('firmalar')
        .select('id, status, created_at')
        .eq('sahip_id', userId);

    const myCustomerIds = (myCustomers ?? []).map((c: any) => c.id);
    const aday = (myCustomers ?? []).filter((c: any) => c.status === 'ADAY').length;
    const temas = (myCustomers ?? []).filter((c: any) => ['TEMAS EDİLDİ', 'NUMUNE VERİLDİ'].includes(c.status)).length;
    const aktifMusteri = (myCustomers ?? []).filter((c: any) => ['MÜŞTERİ', 'Müşteri'].includes(c.status)).length;
    const toplamFunnel = aday + temas + aktifMusteri;
    const yeniMusteriBuAy = (myCustomers ?? []).filter((c: any) =>
        c.created_at && c.created_at >= `${periodStart}T00:00:00` && ['MÜŞTERİ', 'Müşteri'].includes(c.status)
    ).length;

    // ── Paralel sorgular (alt bayi perspektifinden)
    const [
        kendiSiparisAcikRes,        // Bizden bekleyen kendi siparişlerim
        musteriSiparisBuAyRes,      // Müşterilerime yapılan satışlar - bu ay
        musteriSiparisGecenAyRes,   // Müşterilerime yapılan satışlar - geçen ay
        musteriSiparisDurumRes,     // Müşterilerimin sipariş durum dağılımı
        gecenSiparislerimRes,       // Son müşteri siparişlerim
        gorevAcikRes,               // Bana atanmış görevler
        gorevGecikenRes,            // Geciken görevlerim
        gorevYaklasanRes,           // Yaklaşan görevlerim
        bekleyenTalepRes,           // Bekleyen numune/fiyat talepleri
        hedeflerRes,                // Hedefler (system_settings)
    ] = await Promise.all([
        supabase.from('siparisler')
            .select('id', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('siparis_durumu', OPEN_STATUSES),

        myCustomerIds.length > 0
            ? supabase.from('siparisler')
                .select('toplam_tutar_net, siparis_durumu')
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
                .gte('created_at', new Date(now.getTime() - 30 * 86400000).toISOString())
            : Promise.resolve({ data: [], error: null }),

        myCustomerIds.length > 0
            ? (supabase as any).from('siparisler')
                .select('id, siparis_durumu, toplam_tutar_net, siparis_tarihi, firma_id, firmalar(unvan)')
                .in('firma_id', myCustomerIds)
                .order('created_at', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [], error: null }),

        supabase.from('gorevler')
            .select('id', { count: 'exact', head: true })
            .or(`atanan_kisi_id.eq.${userId},sahip_id.eq.${userId},olusturan_kisi_id.eq.${userId}`)
            .eq('tamamlandi', false),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik')
            .or(`atanan_kisi_id.eq.${userId},sahip_id.eq.${userId},olusturan_kisi_id.eq.${userId}`)
            .eq('tamamlandi', false)
            .lt('son_tarih', todayISO)
            .order('son_tarih', { ascending: true })
            .limit(5),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik')
            .or(`atanan_kisi_id.eq.${userId},sahip_id.eq.${userId},olusturan_kisi_id.eq.${userId}`)
            .eq('tamamlandi', false)
            .gte('son_tarih', todayISO)
            .lte('son_tarih', thirtyDaysLater)
            .order('son_tarih', { ascending: true })
            .limit(5),

        (supabase as any).from('sample_requests')
            .select('id', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('status', ['Beklemede', 'pending', 'İncelemede']),

        (supabase as any).from('bayi_hedefleri')
            .select('hedef_ciro, hedef_musteri, hedef_siparis')
            .eq('firma_id', firmaId)
            .maybeSingle(),
    ]);

    // ── Hesaplamalar
    const buAyData = (musteriSiparisBuAyRes.data ?? []) as any[];
    const gecenAyData = (musteriSiparisGecenAyRes.data ?? []) as any[];

    const buAyCiro = buAyData.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const gecenAyCiro = gecenAyData.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const ciroDelta = gecenAyCiro > 0 ? Math.round(((buAyCiro - gecenAyCiro) / gecenAyCiro) * 100) : null;

    const buAySiparisAdedi = buAyData.length;

    const sipDag = (musteriSiparisDurumRes.data ?? []) as any[];
    const sipCount = (statuses: string[]) => sipDag.filter(d => statuses.includes(d.siparis_durumu)).length;

    const kendiAcikSiparis = kendiSiparisAcikRes.count ?? 0;
    const gorevAcik = gorevAcikRes.count ?? 0;
    const gecikenGorevler = (gorevGecikenRes.data ?? []) as any[];
    const yaklasenGorevler = (gorevYaklasanRes.data ?? []) as any[];
    const bekleyenTalep = bekleyenTalepRes.count ?? 0;
    const sonSiparisler = (gecenSiparislerimRes.data ?? []) as any[];

    // Hedefleri bayi_hedefleri tablosundan oku, yoksa default
    const hedeflerRow = (hedeflerRes as any)?.data ?? null;
    const hedefCiro = Number(hedeflerRow?.hedef_ciro ?? 10000);
    const hedefMusteri = Number(hedeflerRow?.hedef_musteri ?? 3);
    const hedefSiparis = Number(hedeflerRow?.hedef_siparis ?? 10);

    const ciroPct = Math.min(100, Math.round((buAyCiro / hedefCiro) * 100));
    const musteriPct = Math.min(100, Math.round((yeniMusteriBuAy / hedefMusteri) * 100));
    const siparisPct = Math.min(100, Math.round((buAySiparisAdedi / hedefSiparis) * 100));

    return (
        <div className="space-y-5 pb-10">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Bayi Cockpit</h1>
                    <p className="text-sm text-slate-500">
                        {firmaUnvan} · {now.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/${locale}/portal/musterilerim`}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                        Müşterilerim
                    </Link>
                    <Link href={`/${locale}/portal/siparisler/yeni`}
                        className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
                        <FiPlus size={11} /> Sipariş Ver
                    </Link>
                </div>
            </div>

            {/* ── Quick Stats Bar (5 kart) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    {
                        label: 'Bu Ay Satışlar', value: fmt(buAyCiro), bg: 'bg-[#E6F1FB]', text: 'text-blue-800',
                        sub: ciroDelta !== null ? `${ciroDelta > 0 ? '+' : ''}${ciroDelta}% geçen ay` : 'Geçen ay verisi yok',
                        icon: ciroDelta !== null && ciroDelta > 0 ? <FiTrendingUp size={13} /> : ciroDelta !== null && ciroDelta < 0 ? <FiTrendingDown size={13} /> : null,
                        href: `/${locale}/portal/raporlar`,
                    },
                    { label: 'Sipariş Adedi', value: String(buAySiparisAdedi), bg: 'bg-[#EAF3DE]', text: 'text-green-800', sub: 'Bu ay müşteri sipariş', icon: <FiPackage size={13} />, href: `/${locale}/portal/siparisler` },
                    { label: 'Aktif Müşteri', value: String(aktifMusteri), bg: 'bg-[#FAEEDA]', text: 'text-orange-800', sub: `${toplamFunnel} toplam temas`, icon: <FiUsers size={13} />, href: `/${locale}/portal/musterilerim` },
                    { label: 'Açık Görev', value: String(gorevAcik), bg: 'bg-[#FCEBEB]', text: gecikenGorevler.length > 0 ? 'text-red-700' : 'text-slate-800', sub: gecikenGorevler.length > 0 ? `${gecikenGorevler.length} geciken` : 'Görev sayım', icon: <FiClipboard size={13} />, href: `/${locale}/portal/gorevlerim` },
                    { label: 'Bekleyen Talep', value: String(bekleyenTalep + kendiAcikSiparis), bg: 'bg-slate-100', text: 'text-slate-800', sub: 'Numune + bekleyen', icon: <FiAlertCircle size={13} />, href: `/${locale}/portal/taleplerim` },
                ].map(c => (
                    <Link
                        key={c.label}
                        href={c.href}
                        className={`rounded-xl border border-slate-200/60 px-4 py-3.5 ${c.bg} hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer block`}
                    >
                        <div className="flex items-center justify-between">
                            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
                            {c.icon && <span className={`${c.text} opacity-60`}>{c.icon}</span>}
                        </div>
                        <p className="text-[12px] font-medium text-slate-600 mt-0.5">{c.label}</p>
                        {c.sub && <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>}
                    </Link>
                ))}
            </div>

            {/* ── Hızlı İşlemler ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Hızlı İşlemler</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Yeni Müşteri', icon: <FiUsers size={16} />, href: `/${locale}/portal/musterilerim`, bg: 'bg-blue-100 text-blue-700' },
                        { label: 'Müşteri Sipariş', icon: <FiPackage size={16} />, href: `/${locale}/portal/musterilerim`, bg: 'bg-orange-100 text-orange-700' },
                        { label: 'Kendi Siparişim', icon: <FiBox size={16} />, href: `/${locale}/portal/siparisler/yeni`, bg: 'bg-green-100 text-green-700' },
                        { label: 'Yeni Görev', icon: <FiClipboard size={16} />, href: `/${locale}/portal/gorevlerim`, bg: 'bg-teal-100 text-teal-700' },
                        { label: 'Numune Talep', icon: <FiArchive size={16} />, href: `/${locale}/portal/taleplerim`, bg: 'bg-purple-100 text-purple-700' },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700 group min-h-[40px]">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-105 transition-transform`}>{a.icon}</span>
                            {a.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Hedef Takibi + Müşteri Hunisi ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Hedef Takibi */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiTarget size={14} className="text-blue-500" /> Aylık Hedef Takibi
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
                            { label: 'Satış Cirosu', current: fmt(buAyCiro), target: fmt(hedefCiro), pct: ciroPct },
                            { label: 'Yeni Müşteri', current: String(yeniMusteriBuAy), target: String(hedefMusteri), pct: musteriPct },
                            { label: 'Sipariş Adedi', current: String(buAySiparisAdedi), target: String(hedefSiparis), pct: siparisPct },
                        ].map(h => (
                            <div key={h.label}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-slate-600">{h.label}</span>
                                    <span className="text-xs text-slate-500">
                                        <strong className="text-slate-800">{h.current}</strong> / {h.target}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${h.pct >= 100 ? 'bg-emerald-500' : h.pct >= 60 ? 'bg-blue-500' : 'bg-amber-400'}`}
                                        style={{ width: `${h.pct}%` }} />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 text-right">
                                    {h.pct >= 100 ? '🎯 Hedef aşıldı!' : `%${h.pct} tamamlandı`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Müşteri Hunisi */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiUsers size={14} className="text-purple-500" /> Müşteri Hunisi
                        </p>
                        <Link href={`/${locale}/portal/musterilerim`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            CRM <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {toplamFunnel === 0 ? (
                        <div className="py-6 text-center">
                            <div className="text-3xl mb-2">👥</div>
                            <p className="text-sm text-slate-500">Henüz müşteri yok</p>
                            <Link href={`/${locale}/portal/musterilerim`}
                                className="mt-3 inline-block text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                                + İlk müşterini ekle
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[
                                { label: 'Aday', count: aday, color: 'bg-slate-300', textColor: 'text-slate-600' },
                                { label: 'Temas / Numune', count: temas, color: 'bg-blue-400', textColor: 'text-blue-700' },
                                { label: 'Aktif Müşteri', count: aktifMusteri, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                            ].map(row => {
                                const pct = toplamFunnel > 0 ? Math.round((row.count / toplamFunnel) * 100) : 0;
                                return (
                                    <div key={row.label}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-600 font-medium">{row.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${row.textColor}`}>{row.count}</span>
                                                <span className="text-xs text-slate-400">(%{pct})</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${row.color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 text-center">
                                Toplam <strong className="text-slate-700">{toplamFunnel}</strong> kontak ·{' '}
                                <strong className="text-emerald-600">{aktifMusteri}</strong> aktif
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Siparişler (Müşteri sipariş durumu) + Görevler ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Müşteri Sipariş Durumu */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPackage size={14} className="text-orange-500" /> Müşteri Siparişleri (30 gün)
                        </p>
                        <Link href={`/${locale}/portal/siparisler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {sipDag.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Son 30 günde müşteri siparişi yok</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {[
                                    { label: 'Beklemede', val: sipCount(['Beklemede']), cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                                    { label: 'Hazırlanıyor', val: sipCount(['Hazırlanıyor', 'processing']), cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                                    { label: 'Yolda', val: sipCount(['Yola Çıktı', 'shipped']), cls: 'bg-violet-50 text-violet-700 border-violet-200' },
                                    { label: 'Teslim', val: sipCount(['Teslim Edildi', 'delivered']), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                ].map(s => (
                                    <div key={s.label} className={`rounded-lg border px-2.5 py-2 text-center ${s.cls}`}>
                                        <p className="text-lg font-bold">{s.val}</p>
                                        <p className="text-[10px] font-semibold">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            {sonSiparisler.length > 0 && (
                                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Son Siparişler</p>
                                    {sonSiparisler.slice(0, 3).map((s: any) => (
                                        <Link key={s.id} href={`/${locale}/portal/musterilerim/${s.firma_id}/siparisler`}
                                            className="flex items-center justify-between text-xs py-1.5 hover:bg-slate-50 rounded transition-colors px-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-700 truncate">{s.firmalar?.unvan || '—'}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(s.siparis_tarihi).toLocaleDateString(locale)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CHIP[s.siparis_durumu] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    {STATUS_LABEL[s.siparis_durumu] ?? s.siparis_durumu}
                                                </span>
                                                <span className="font-bold text-slate-700">{fmt(s.toplam_tutar_net)}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Görevler */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiClipboard size={14} className="text-teal-500" /> Görevlerim
                        </p>
                        <Link href={`/${locale}/portal/gorevlerim`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>

                    {gecikenGorevler.length === 0 && yaklasenGorevler.length === 0 ? (
                        <div className="py-6 text-center">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FiCheckCircle size={18} className="text-emerald-600" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Aktif görev yok</p>
                            <p className="text-xs text-slate-400 mt-0.5">Tüm görevleri tamamladın 👏</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Geciken görevler */}
                            {gecikenGorevler.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1">
                                        <FiAlertCircle size={10} /> Geciken ({gecikenGorevler.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {gecikenGorevler.slice(0, 3).map((g: any) => (
                                            <Link key={g.id} href={`/${locale}/portal/gorevlerim`}
                                                className="block bg-red-50 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors">
                                                <p className="text-xs font-semibold text-red-900 truncate">{g.baslik}</p>
                                                <p className="text-[10px] text-red-600 mt-0.5">
                                                    {g.son_tarih ? new Date(g.son_tarih).toLocaleDateString(locale) : '—'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Yaklaşan görevler */}
                            {yaklasenGorevler.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                        <FiCalendar size={10} /> Yaklaşan ({yaklasenGorevler.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {yaklasenGorevler.slice(0, 4).map((g: any) => (
                                            <Link key={g.id} href={`/${locale}/portal/gorevlerim`}
                                                className="block bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-slate-700 truncate flex-1">{g.baslik}</p>
                                                    {g.oncelik && (
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${g.oncelik === 'Yüksek' || g.oncelik === 'Acil' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                                            {g.oncelik}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {g.son_tarih ? new Date(g.son_tarih).toLocaleDateString(locale) : '—'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bizden Beklenen Siparişlerim ── */}
            {kendiAcikSiparis > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiPackage size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-blue-900">
                                {kendiAcikSiparis} açık siparişim bizden bekliyor
                            </p>
                            <p className="text-xs text-blue-700">Sipariş durumlarını takip et</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/portal/siparisler`}
                        className="text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1">
                        Görüntüle <FiPlay size={11} />
                    </Link>
                </div>
            )}
        </div>
    );
}
