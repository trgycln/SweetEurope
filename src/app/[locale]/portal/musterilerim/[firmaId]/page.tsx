import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import {
    FiUsers, FiPackage, FiCheckSquare, FiActivity, FiCalendar,
    FiDollarSign, FiAlertCircle, FiTrendingUp, FiPlus, FiExternalLink,
    FiMail, FiPhone, FiMapPin, FiTag, FiClock, FiEdit,
} from 'react-icons/fi';
import { MusteriOzetGrafik } from '@/components/portal/musterilerim/MusteriOzetGrafik';
import { VisitToggleButton } from '@/components/portal/musterilerim/VisitToggleButton';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale; firmaId: string }>;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const STATUS_COLOR: Record<string, string> = {
    'Beklemede': 'bg-amber-100 text-amber-700',
    'Hazırlanıyor': 'bg-blue-100 text-blue-700',
    'Yola Çıktı': 'bg-violet-100 text-violet-700',
    'shipped': 'bg-violet-100 text-violet-700',
    'Teslim Edildi': 'bg-emerald-100 text-emerald-700',
    'delivered': 'bg-emerald-100 text-emerald-700',
    'İptal Edildi': 'bg-red-100 text-red-700',
    'cancelled': 'bg-red-100 text-red-700',
    'processing': 'bg-cyan-100 text-cyan-700',
};

const STATUS_LABEL_TR: Record<string, string> = {
    'ADAY': 'Aday',
    'TEMAS EDİLDİ': 'Temas Edildi',
    'NUMUNE VERİLDİ': 'Numune Verildi',
    'MÜŞTERİ': 'Aktif Müşteri',
    'Müşteri': 'Aktif Müşteri',
    'ALT BAYİ': 'Alt Bayi',
    'KAYBEDİLDİ': 'Kaybedildi',
};

const STATUS_BADGE: Record<string, string> = {
    'ADAY': 'bg-slate-100 text-slate-700 border-slate-200',
    'TEMAS EDİLDİ': 'bg-blue-100 text-blue-700 border-blue-200',
    'NUMUNE VERİLDİ': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'MÜŞTERİ': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Müşteri': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'ALT BAYİ': 'bg-purple-100 text-purple-700 border-purple-200',
    'KAYBEDİLDİ': 'bg-red-100 text-red-700 border-red-200',
};

export default async function MusteriOzetPage({ params }: PageProps) {
    noStore();
    const { locale, firmaId } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    // Firma sahibi mi kontrol et (security)
    const { data: firma } = await (supabase as any)
        .from('firmalar')
        .select('*')
        .eq('id', firmaId)
        .eq('sahip_id', user.id)
        .single();

    if (!firma) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700 font-semibold">Bu müşteri size ait değil veya bulunamadı.</p>
                <Link href={`/${locale}/portal/musterilerim`} className="text-blue-600 underline mt-2 inline-block">
                    Müşteri listesine dön
                </Link>
            </div>
        );
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Paralel veri çek
    const [
        siparislerRes,
        gorevlerRes,
        kisilerRes,
        etkinliklerRes,
    ] = await Promise.all([
        supabase
            .from('siparisler')
            .select('id, siparis_durumu, toplam_tutar_net, siparis_tarihi, created_at')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false }),

        supabase
            .from('gorevler')
            .select('id, baslik, tamamlandi, son_tarih, oncelik')
            .eq('ilgili_firma_id', firmaId)
            .order('son_tarih', { ascending: true })
            .limit(10),

        (supabase as any).from('dis_kontaklar')
            .select('id, ad_soyad, unvan, telefon, email')
            .eq('firma_id', firmaId)
            .limit(5),

        (supabase as any).from('etkinlikler')
            .select('id, etkinlik_tipi, aciklama, created_at')
            .eq('firma_id', firmaId)
            .order('created_at', { ascending: false })
            .limit(8),
    ]);

    const siparisler = (siparislerRes.data ?? []) as any[];
    const gorevler = (gorevlerRes.data ?? []) as any[];
    const kisiler = (kisilerRes.data ?? []) as any[];
    const etkinlikler = (etkinliklerRes.data ?? []) as any[];

    // Sipariş istatistikleri
    const toplamCiro = siparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const toplamSiparisAdedi = siparisler.length;
    const ortalamaSepet = toplamSiparisAdedi > 0 ? toplamCiro / toplamSiparisAdedi : 0;
    const aktifSiparisler = siparisler.filter(o =>
        ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing', 'shipped'].includes(o.siparis_durumu)
    );

    // Son 12 ay aylık ciro
    const aylikCiroMap = new Map<string, { ciro: number; adet: number }>();
    // 12 ayın hepsini başlat (boş olanlar için 0)
    for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        aylikCiroMap.set(key, { ciro: 0, adet: 0 });
    }
    for (const o of siparisler) {
        if (!o.siparis_tarihi) continue;
        const d = new Date(o.siparis_tarihi);
        if (d < twelveMonthsAgo) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const ex = aylikCiroMap.get(key);
        if (ex) {
            ex.ciro += Number(o.toplam_tutar_net || 0);
            ex.adet += 1;
        }
    }
    const aylikGrafikVeri = Array.from(aylikCiroMap.entries()).map(([month, v]) => ({
        month, ciro: v.ciro, adet: v.adet,
    }));

    // Görev istatistikleri
    const acikGorevler = gorevler.filter(g => !g.tamamlandi);
    const gecikenGorevler = acikGorevler.filter(g => g.son_tarih && g.son_tarih < now.toISOString());

    // Son sipariş tarihi
    const sonSiparis = siparisler[0];
    const sonSiparisTarihi = sonSiparis?.siparis_tarihi
        ? Math.floor((now.getTime() - new Date(sonSiparis.siparis_tarihi).getTime()) / 86400000)
        : null;

    // Müşteri sağlık skoru (basit hesap)
    let saglikSkoru = 0;
    let saglikRenk = 'red';
    let saglikLabel = 'Pasif';
    if (sonSiparisTarihi !== null) {
        if (sonSiparisTarihi <= 30) { saglikSkoru = 100; saglikRenk = 'emerald'; saglikLabel = 'Aktif'; }
        else if (sonSiparisTarihi <= 60) { saglikSkoru = 75; saglikRenk = 'blue'; saglikLabel = 'Düzenli'; }
        else if (sonSiparisTarihi <= 90) { saglikSkoru = 50; saglikRenk = 'amber'; saglikLabel = 'Uyarı'; }
        else { saglikSkoru = 25; saglikRenk = 'red'; saglikLabel = 'Risk'; }
    }

    return (
        <div className="space-y-5">
            {/* ── Üst Bilgi Bandı ── */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h2 className="text-xl font-bold text-slate-800">{firma.unvan}</h2>
                            {firma.status && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[firma.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {STATUS_LABEL_TR[firma.status] || firma.status}
                                </span>
                            )}
                            {firma.oncelik && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${firma.oncelik === 'A' ? 'bg-red-100 text-red-700' : firma.oncelik === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {firma.oncelik} Öncelik
                                </span>
                            )}
                            {firma.kategori && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    <FiTag size={9} className="inline mr-0.5" /> {firma.kategori}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {firma.telefon && <span className="flex items-center gap-1"><FiPhone size={11} /> {firma.telefon}</span>}
                            {firma.email && <span className="flex items-center gap-1"><FiMail size={11} /> {firma.email}</span>}
                            {firma.adres && <span className="flex items-center gap-1 truncate"><FiMapPin size={11} /> {firma.adres}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <VisitToggleButton company={{
                            id: firma.id,
                            unvan: firma.unvan,
                            adres: firma.adres ?? null,
                            sehir: firma.sehir ?? null,
                            ilce: firma.ilce ?? null,
                            posta_kodu: firma.posta_kodu ?? null,
                            google_maps_url: firma.google_maps_url ?? null,
                            telefon: firma.telefon ?? null,
                            parent_firma_id: firma.parent_firma_id ?? null,
                        }} size="sm" />
                        <Link href={`/${locale}/portal/musterilerim/${firmaId}/bilgiler`}
                            className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                            <FiEdit size={11} /> Bilgileri Düzenle
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── 5'li KPI Kartlar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Toplam Ciro', value: fmt(toplamCiro), bg: 'bg-blue-50', text: 'text-blue-800', sub: `${toplamSiparisAdedi} sipariş`, icon: <FiDollarSign size={13} /> },
                    { label: 'Ort. Sepet', value: fmt(ortalamaSepet), bg: 'bg-green-50', text: 'text-green-800', sub: 'Sipariş başına', icon: <FiTrendingUp size={13} /> },
                    { label: 'Aktif Sipariş', value: String(aktifSiparisler.length), bg: 'bg-orange-50', text: 'text-orange-800', sub: 'Devam ediyor', icon: <FiPackage size={13} /> },
                    { label: 'Açık Görev', value: String(acikGorevler.length), bg: 'bg-amber-50', text: gecikenGorevler.length > 0 ? 'text-red-700' : 'text-amber-800', sub: gecikenGorevler.length > 0 ? `${gecikenGorevler.length} geciken` : 'Aktif görev', icon: <FiCheckSquare size={13} /> },
                    {
                        label: 'Müşteri Sağlığı',
                        value: saglikLabel,
                        bg: saglikRenk === 'emerald' ? 'bg-emerald-50' : saglikRenk === 'blue' ? 'bg-blue-50' : saglikRenk === 'amber' ? 'bg-amber-50' : 'bg-red-50',
                        text: saglikRenk === 'emerald' ? 'text-emerald-800' : saglikRenk === 'blue' ? 'text-blue-800' : saglikRenk === 'amber' ? 'text-amber-800' : 'text-red-800',
                        sub: sonSiparisTarihi !== null ? `${sonSiparisTarihi} gün önce` : 'Sipariş yok',
                        icon: <FiActivity size={13} />,
                    },
                ].map(c => (
                    <div key={c.label} className={`rounded-xl border border-slate-200/60 p-4 ${c.bg}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`${c.text} opacity-60`}>{c.icon}</span>
                        </div>
                        <p className={`text-lg font-bold ${c.text} leading-tight`}>{c.value}</p>
                        <p className="text-[11px] font-medium text-slate-600 mt-0.5">{c.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Hızlı İşlemler ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Hızlı İşlemler</p>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/${locale}/portal/siparisler/yeni?firma_id=${firmaId}`}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-100 hover:border-orange-200 hover:shadow-sm transition-all text-sm font-medium text-orange-800">
                        <FiPlus size={13} /> Yeni Sipariş
                    </Link>
                    <Link href={`/${locale}/portal/musterilerim/${firmaId}/gorevler`}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-100 hover:border-teal-200 hover:shadow-sm transition-all text-sm font-medium text-teal-800">
                        <FiCheckSquare size={13} /> Görev Ekle
                    </Link>
                    <Link href={`/${locale}/portal/musterilerim/${firmaId}/etkinlikler`}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-200 hover:shadow-sm transition-all text-sm font-medium text-blue-800">
                        <FiActivity size={13} /> Etkinlik Ekle
                    </Link>
                    <Link href={`/${locale}/portal/musterilerim/${firmaId}/kisiler`}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-100 hover:border-purple-200 hover:shadow-sm transition-all text-sm font-medium text-purple-800">
                        <FiUsers size={13} /> Kişi Ekle
                    </Link>
                </div>
            </div>

            {/* ── Aylık Ciro Grafik + Son Siparişler ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Grafik - 2/3 */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700">📊 Son 12 Ay Ciro</h3>
                        <span className="text-[11px] text-slate-400">Aylık satış grafiği</span>
                    </div>
                    {toplamCiro === 0 ? (
                        <div className="py-10 text-center">
                            <div className="text-3xl mb-2">📈</div>
                            <p className="text-sm text-slate-500">Henüz sipariş geçmişi yok</p>
                        </div>
                    ) : (
                        <MusteriOzetGrafik data={aylikGrafikVeri} />
                    )}
                </div>

                {/* Son Siparişler - 1/3 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700">📦 Son Siparişler</h3>
                        <Link href={`/${locale}/portal/musterilerim/${firmaId}/siparisler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {siparisler.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Henüz sipariş yok</p>
                    ) : (
                        <div className="space-y-2">
                            {siparisler.slice(0, 5).map((s: any) => (
                                <div key={s.id} className="border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-700">
                                                {fmt(Number(s.toplam_tutar_net || 0))}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {s.siparis_tarihi ? new Date(s.siparis_tarihi).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                            </p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[s.siparis_durumu] || 'bg-slate-100 text-slate-600'}`}>
                                            {s.siparis_durumu}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Görevler + Etkinlik Timeline ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Görevler */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiCheckSquare size={14} className="text-teal-500" /> Görevler
                        </h3>
                        <Link href={`/${locale}/portal/musterilerim/${firmaId}/gorevler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {acikGorevler.length === 0 ? (
                        <div className="py-6 text-center">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <FiCheckSquare size={18} className="text-emerald-600" />
                            </div>
                            <p className="text-sm text-slate-500">Açık görev yok</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {acikGorevler.slice(0, 5).map((g: any) => {
                                const isOverdue = g.son_tarih && g.son_tarih < now.toISOString();
                                return (
                                    <div key={g.id} className={`rounded-lg px-3 py-2 border ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs font-semibold truncate flex-1 ${isOverdue ? 'text-red-900' : 'text-slate-700'}`}>
                                                {g.baslik}
                                            </p>
                                            {g.oncelik && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${g.oncelik === 'Yüksek' || g.oncelik === 'Acil' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {g.oncelik}
                                                </span>
                                            )}
                                        </div>
                                        {g.son_tarih && (
                                            <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
                                                {isOverdue && <FiAlertCircle size={9} />}
                                                <FiCalendar size={9} /> {new Date(g.son_tarih).toLocaleDateString(locale)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Etkinlik Timeline */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiActivity size={14} className="text-blue-500" /> Etkinlik Akışı
                        </h3>
                        <Link href={`/${locale}/portal/musterilerim/${firmaId}/etkinlikler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {etkinlikler.length === 0 ? (
                        <div className="py-6 text-center">
                            <div className="text-3xl mb-2">📋</div>
                            <p className="text-sm text-slate-400">Henüz etkinlik yok</p>
                            <Link href={`/${locale}/portal/musterilerim/${firmaId}/etkinlikler`}
                                className="mt-3 inline-block text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                                + İlk etkinliği ekle
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {etkinlikler.slice(0, 6).map((e: any, i: number) => (
                                <div key={e.id} className="flex gap-3 text-xs">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        {i < etkinlikler.slice(0, 6).length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                                    </div>
                                    <div className="pb-2 flex-1 min-w-0">
                                        <p className="font-semibold text-slate-700 text-xs">{e.etkinlik_tipi || 'Etkinlik'}</p>
                                        {e.aciklama && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{e.aciklama}</p>}
                                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                            <FiClock size={9} />
                                            {new Date(e.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── İlgili Kişiler (özet) ── */}
            {kisiler.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiUsers size={14} className="text-purple-500" /> İlgili Kişiler
                        </h3>
                        <Link href={`/${locale}/portal/musterilerim/${firmaId}/kisiler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {kisiler.slice(0, 3).map((k: any) => (
                            <div key={k.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                <p className="text-sm font-semibold text-slate-700">{k.ad_soyad}</p>
                                {k.unvan && <p className="text-[11px] text-slate-500 mt-0.5">{k.unvan}</p>}
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                                    {k.telefon && <a href={`tel:${k.telefon}`} className="flex items-center gap-1 hover:text-blue-600"><FiPhone size={10} /> {k.telefon}</a>}
                                    {k.email && <a href={`mailto:${k.email}`} className="flex items-center gap-1 hover:text-blue-600 truncate"><FiMail size={10} /> {k.email}</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
