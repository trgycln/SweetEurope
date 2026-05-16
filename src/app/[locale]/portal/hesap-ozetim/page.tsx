import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import {
    FiArrowLeft, FiTrendingUp, FiDollarSign, FiClock,
    FiAlertCircle, FiCheckCircle, FiPercent, FiCalendar,
    FiPackage, FiExternalLink, FiTrendingDown,
} from 'react-icons/fi';
import { HesapOzetTrend } from '@/components/portal/hesap-ozetim/HesapOzetTrend';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default async function HesapOzetimPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id || profile.rol !== 'Müşteri') {
        return redirect(`/${locale}/portal/dashboard`);
    }

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const prevYearStart = `${now.getFullYear() - 1}-01-01`;
    const prevYearEnd = `${now.getFullYear() - 1}-12-31`;
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const twelveMonthsAgoStr = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    // Tüm sorgular paralel
    const [
        finansalRes,
        firmaRes,
        siparislerYilRes,
        siparislerOncekYilRes,
        siparisler12AyRes,
        bekleyenTeslimRes,
    ] = await Promise.all([
        (supabase as any).from('firmalar_finansal')
            .select('odeme_vadesi_gun, ozel_indirim_orani')
            .eq('firma_id', profile.firma_id)
            .maybeSingle(),

        supabase.from('firmalar')
            .select('unvan, created_at')
            .eq('id', profile.firma_id)
            .single(),

        supabase.from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, toplam_tutar_brut, created_at')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', yearStart)
            .order('siparis_tarihi', { ascending: false }),

        supabase.from('siparisler')
            .select('toplam_tutar_net')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', prevYearStart)
            .lte('siparis_tarihi', prevYearEnd),

        supabase.from('siparisler')
            .select('siparis_tarihi, toplam_tutar_net')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', twelveMonthsAgoStr),

        supabase.from('siparisler')
            .select('id, siparis_tarihi, toplam_tutar_net, toplam_tutar_brut, siparis_durumu, created_at')
            .eq('firma_id', profile.firma_id)
            .in('siparis_durumu', ['Teslim Edildi', 'delivered'])
            .order('siparis_tarihi', { ascending: false })
            .limit(20),
    ]);

    const siparislerYil = (siparislerYilRes.data ?? []) as any[];
    const siparislerOncekYil = (siparislerOncekYilRes.data ?? []) as any[];
    const siparisler12Ay = (siparisler12AyRes.data ?? []) as any[];
    const teslim = (bekleyenTeslimRes.data ?? []) as any[];

    const odemeVadesi = finansalRes.data?.odeme_vadesi_gun ?? 30;
    const indirimOrani = finansalRes.data?.ozel_indirim_orani ?? 0;
    const firma = firmaRes.data;

    // Hesaplamalar
    const yilTotal = siparislerYil.reduce((s, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const yilBrutTotal = siparislerYil.reduce((s, o: any) => s + Number(o.toplam_tutar_brut || 0), 0);
    const oncekiYilTotal = siparislerOncekYil.reduce((s, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const yillikDelta = oncekiYilTotal > 0 ? Math.round(((yilTotal - oncekiYilTotal) / oncekiYilTotal) * 100) : null;
    const ortSiparis = siparislerYil.length > 0 ? yilTotal / siparislerYil.length : 0;

    // Açık bakiye tahmini: son N gün içinde teslim edilenler, vade dolmamış olanlar
    // (sistemde fatura ödendi/ödenmedi alanı yoksa, vade tarihiyle hesaplıyoruz)
    const today = new Date();
    const vadelerAciklik: { siparisId: string; tutar: number; vadeTarihi: Date; kalanGun: number }[] = [];
    let acikBakiye = 0;
    let yaklasanVade = 0;
    let gecikmisVade = 0;

    for (const s of teslim) {
        if (!s.created_at) continue;
        const vadeTarihi = new Date(new Date(s.created_at).getTime() + odemeVadesi * 86400000);
        const kalanGun = Math.ceil((vadeTarihi.getTime() - today.getTime()) / 86400000);
        const tutar = Number(s.toplam_tutar_brut || 0);
        // Son odemeVadesi*2 günden eskileri ödenmiş kabul ediyoruz (basit yaklaşım)
        if (kalanGun > -odemeVadesi) {
            vadelerAciklik.push({ siparisId: s.id, tutar, vadeTarihi, kalanGun });
            acikBakiye += tutar;
            if (kalanGun < 0) gecikmisVade += tutar;
            else if (kalanGun <= 7) yaklasanVade += tutar;
        }
    }

    // Aylık trend (son 12 ay)
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trendMap.set(key, 0);
    }
    for (const s of siparisler12Ay) {
        if (!s.siparis_tarihi) continue;
        const key = s.siparis_tarihi.slice(0, 7);
        const ex = trendMap.get(key);
        if (ex !== undefined) trendMap.set(key, ex + Number(s.toplam_tutar_net || 0));
    }
    const trendData = Array.from(trendMap.entries()).map(([month, tutar]) => ({ month, tutar }));

    // Müşteri olma süresi
    const membershipDays = firma?.created_at
        ? Math.floor((Date.now() - new Date(firma.created_at).getTime()) / 86400000)
        : 0;
    const membershipText = membershipDays >= 365
        ? `${Math.floor(membershipDays / 365)} yıl`
        : `${Math.floor(membershipDays / 30)} ay`;

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/${locale}/portal/dashboard`}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <FiArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hesap Özetim</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {firma?.unvan} · Müşterimizsiniz: <strong>{membershipText}</strong>
                    </p>
                </div>
            </div>

            {/* Uyarı banner (varsa) */}
            {gecikmisVade > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiAlertCircle size={18} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-900">
                            Vadesi geçmiş ödemeniz mevcut: {fmt(gecikmisVade)}
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                            Ödeme bilgileriniz için bizimle iletişime geçebilirsiniz.
                        </p>
                    </div>
                    <Link href={`/${locale}/contact`}
                        className="text-xs font-bold bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex-shrink-0">
                        İletişim
                    </Link>
                </div>
            )}

            {yaklasanVade > 0 && gecikmisVade === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiClock size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">
                            7 gün içinde vadesi gelecek: {fmt(yaklasanVade)}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Vade durumlarınızı aşağıdaki tablodan takip edebilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Kartlar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-blue-200/60 p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Bu Yıl Net</p>
                        <FiTrendingUp size={14} className="text-blue-500" />
                    </div>
                    <p className="text-xl font-bold text-blue-800">{fmt(yilTotal)}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-slate-500">{siparislerYil.length} sipariş</p>
                        {yillikDelta !== null && (
                            <span className={`text-[10px] font-bold ${yillikDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {yillikDelta >= 0 ? '+' : ''}{yillikDelta}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-orange-200/60 p-4 bg-gradient-to-br from-orange-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Açık Bakiye</p>
                        <FiDollarSign size={14} className="text-orange-500" />
                    </div>
                    <p className="text-xl font-bold text-orange-800">{fmt(acikBakiye)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{vadelerAciklik.length} açık fatura</p>
                </div>

                <div className="rounded-xl border border-purple-200/60 p-4 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">Ort. Sepet</p>
                        <FiPackage size={14} className="text-purple-500" />
                    </div>
                    <p className="text-xl font-bold text-purple-800">{fmt(ortSiparis)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Sipariş başına</p>
                </div>

                <div className="rounded-xl border border-emerald-200/60 p-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Avantajlarınız</p>
                        <FiPercent size={14} className="text-emerald-500" />
                    </div>
                    {indirimOrani > 0 ? (
                        <>
                            <p className="text-xl font-bold text-emerald-800">%{indirimOrani}</p>
                            <p className="text-[11px] text-slate-500 mt-1">Özel indirim + {odemeVadesi} gün vade</p>
                        </>
                    ) : (
                        <>
                            <p className="text-xl font-bold text-emerald-800">{odemeVadesi} gün</p>
                            <p className="text-[11px] text-slate-500 mt-1">Ödeme vadesi</p>
                        </>
                    )}
                </div>
            </div>

            {/* Trend grafik */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        📊 Son 12 Ay Sipariş Trendi
                    </h3>
                    <span className="text-[11px] text-slate-400">Aylık net tutar</span>
                </div>
                {trendData.every(d => d.tutar === 0) ? (
                    <div className="py-10 text-center">
                        <p className="text-sm text-slate-400">Son 12 ayda sipariş yok</p>
                    </div>
                ) : (
                    <HesapOzetTrend data={trendData} />
                )}
            </div>

            {/* Açık vade tablosu */}
            {vadelerAciklik.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiCalendar size={14} className="text-orange-500" /> Vade Takvimi
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sipariş</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Vade Tarihi</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Durum</th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tutar (Brüt)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {vadelerAciklik
                                    .sort((a, b) => a.kalanGun - b.kalanGun)
                                    .map(v => {
                                        const isOverdue = v.kalanGun < 0;
                                        const isSoon = v.kalanGun >= 0 && v.kalanGun <= 7;
                                        return (
                                            <tr key={v.siparisId} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <Link href={`/${locale}/portal/siparisler/${v.siparisId}`}
                                                        className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800">
                                                        #{v.siparisId.slice(0, 8).toUpperCase()}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                                    {v.vadeTarihi.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    {isOverdue ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                            {Math.abs(v.kalanGun)} gün gecikti
                                                        </span>
                                                    ) : isSoon ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                            {v.kalanGun} gün kaldı
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                            {v.kalanGun} gün
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-bold text-slate-800">
                                                    {fmt(v.tutar)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-slate-600">Toplam Açık Bakiye:</td>
                                    <td className="px-4 py-3 text-right text-base font-bold text-orange-700">{fmt(acikBakiye)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Sipariş özeti (yıllık) */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FiPackage size={14} className="text-blue-500" /> Yıllık Sipariş Geçmişi
                    </h3>
                    <Link href={`/${locale}/portal/siparisler`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                        Tümü <FiExternalLink size={9} />
                    </Link>
                </div>
                {siparislerYil.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">Bu yıl henüz sipariş yok</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sipariş</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tarih</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Durum</th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Net</th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Brüt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {siparislerYil.slice(0, 15).map((s: any) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Link href={`/${locale}/portal/siparisler/${s.id}`}
                                                className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800">
                                                #{s.id.slice(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                            {new Date(s.siparis_tarihi).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {s.siparis_durumu}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-semibold text-slate-700">
                                            {fmt(s.toplam_tutar_net)}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-slate-800">
                                            {fmt(s.toplam_tutar_brut)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                                        {siparislerYil.length} sipariş toplam:
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">{fmt(yilTotal)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{fmt(yilBrutTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
