// src/app/[locale]/admin/crm/firmalar/[firmaId]/page.tsx
// Profesyonel Firma 360° Özet - Yönetici tarafı
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    FiEdit, FiPhone, FiMail, FiUser, FiTag, FiCalendar, FiExternalLink,
    FiTrendingUp, FiTrendingDown, FiDollarSign, FiPackage, FiAlertCircle,
    FiAward, FiPlus, FiCheckSquare, FiActivity, FiClock, FiMapPin,
    FiShoppingCart, FiPieChart, FiBarChart2,
} from 'react-icons/fi';
import { FaInstagram, FaGlobe, FaLinkedin, FaMapMarkedAlt, FaFacebook } from 'react-icons/fa';
import EtkinlikEkleForm from './etkinlikler/EtkinlikEkleForm';
import { getDictionary } from '@/dictionaries';
import { FirmaOzetGrafik } from '@/components/admin/crm/FirmaOzetGrafik';
import { FirmaSiparisDurumChart } from '@/components/admin/crm/FirmaSiparisDurumChart';
import { PortalErigimiVerButton } from '@/components/admin/crm/PortalErigimiVerButton';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

interface PageProps {
    params: Promise<{ firmaId: string; locale: Locale }>;
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

const fmtPrecise = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'MÜŞTERİ':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'Müşteri':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'ALT BAYİ':       { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    'NUMUNE VERİLDİ': { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500' },
    'TEMAS EDİLDİ':   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
    'ADAY':           { bg: 'bg-amber-100',   text: 'text-amber-800',  dot: 'bg-amber-400' },
    'REDDEDİLDİ':     { bg: 'bg-red-100',     text: 'text-red-800',    dot: 'bg-red-400' },
};

const STATUS_LABEL: Record<string, string> = {
    'MÜŞTERİ': 'Aktif Müşteri',
    'Müşteri': 'Aktif Müşteri',
    'ALT BAYİ': 'Alt Bayi',
    'NUMUNE VERİLDİ': 'Numune Verildi',
    'TEMAS EDİLDİ': 'Temas Edildi',
    'ADAY': 'Aday',
    'REDDEDİLDİ': 'Reddedildi',
};

const ETK_ICON: Record<string, string> = {
    'Not': '📝',
    'Telefon Görüşmesi': '📞',
    'Toplantı': '🤝',
    'E-posta': '✉️',
    'Teklif': '📄',
};

const SIPARIS_STATUS_CHIP: Record<string, string> = {
    'Beklemede': 'bg-amber-100 text-amber-700',
    'Hazırlanıyor': 'bg-blue-100 text-blue-700',
    'processing': 'bg-cyan-100 text-cyan-700',
    'Yola Çıktı': 'bg-violet-100 text-violet-700',
    'shipped': 'bg-violet-100 text-violet-700',
    'Teslim Edildi': 'bg-emerald-100 text-emerald-700',
    'delivered': 'bg-emerald-100 text-emerald-700',
    'İptal Edildi': 'bg-red-100 text-red-700',
    'cancelled': 'bg-red-100 text-red-700',
};

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// Yıllık ciroya göre tier
function calcTier(yearTotal: number): { label: string; color: string; emoji: string } {
    if (yearTotal >= 50000) return { label: 'Platin', color: 'from-violet-500 to-fuchsia-600', emoji: '💎' };
    if (yearTotal >= 20000) return { label: 'Altın', color: 'from-amber-500 to-orange-500', emoji: '🥇' };
    if (yearTotal >= 8000) return { label: 'Gümüş', color: 'from-slate-400 to-slate-500', emoji: '🥈' };
    if (yearTotal >= 2000) return { label: 'Bronz', color: 'from-orange-700 to-amber-800', emoji: '🥉' };
    return { label: 'Yeni', color: 'from-slate-300 to-slate-400', emoji: '🌱' };
}

export default async function FirmaOzetPage({ params }: PageProps) {
    const { firmaId, locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) notFound();

    const dict = await getDictionary(locale);
    const actDict = dict.adminDashboard?.crmPage?.activities || {};

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const prevYearStart = `${now.getFullYear() - 1}-01-01`;
    const prevYearEnd = `${now.getFullYear() - 1}-12-31`;
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const twelveMonthsAgoStr = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
    const todayISO = now.toISOString();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString();

    const [
        firmaRes,
        aktivitelerRes,
        kisilerRes,
        subelerRes,
        siparislerTumRes,
        siparisDetayRes,
        gorevAcikRes,
        gorevGecenRes,
        portalUsersRes,
    ] = await Promise.all([
        supabase.from('firmalar')
            .select('*, sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)')
            .eq('id', firmaId)
            .single(),

        (supabase as any).from('etkinlikler')
            .select('id, etkinlik_tipi, aciklama, created_at, olusturan_personel:profiller!etkinlikler_olusturan_personel_id_fkey(tam_ad)')
            .eq('firma_id', firmaId)
            .order('created_at', { ascending: false })
            .limit(8),

        supabase.from('dis_kontaklar')
            .select('id, ad_soyad, unvan, email, telefon')
            .eq('firma_id', firmaId)
            .limit(4),

        supabase.from('firmalar')
            .select('id, unvan, status')
            .eq('parent_firma_id', firmaId)
            .order('unvan'),

        supabase.from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, toplam_tutar_brut, created_at')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false }),

        // Top ürünler için sipariş detayları (son 12 ay) — JOIN ile ürün bilgisi
        (supabase as any).from('siparis_detay')
            .select(`
                miktar, toplam_fiyat, urun_id, siparis_id,
                urunler(id, ad, stok_kodu, ana_resim_url),
                siparisler!inner(firma_id, siparis_tarihi, siparis_durumu)
            `)
            .eq('siparisler.firma_id', firmaId)
            .gte('siparisler.siparis_tarihi', twelveMonthsAgoStr),

        supabase.from('gorevler')
            .select('id, baslik, son_tarih, oncelik, tamamlandi')
            .eq('ilgili_firma_id', firmaId)
            .eq('tamamlandi', false)
            .lte('son_tarih', thirtyDaysLater)
            .order('son_tarih', { ascending: true })
            .limit(8),

        supabase.from('gorevler')
            .select('id', { count: 'exact', head: true })
            .eq('ilgili_firma_id', firmaId)
            .eq('tamamlandi', true),

        supabase.from('profiller')
            .select('id, tam_ad, rol')
            .eq('firma_id', firmaId),
    ]);

    if (firmaRes.error || !firmaRes.data) notFound();
    const firma = firmaRes.data as any;
    const aktiviteler = (aktivitelerRes.data ?? []) as any[];
    const kisiler = (kisilerRes.data ?? []) as any[];
    const subeler = (subelerRes.data ?? []) as any[];
    const siparislerTum = (siparislerTumRes.data ?? []) as any[];
    const siparisDetay = (siparisDetayRes.data ?? []) as any[];
    const acikGorevler = (gorevAcikRes.data ?? []) as any[];
    const tamamlananGorevSayisi = gorevGecenRes.count ?? 0;
    const portalUsers = (portalUsersRes.data ?? []) as any[];

    // Auto-mark as seen when admin views the firm
    if (firma.goruldu === false && firma.kaynak === 'Web') {
        supabase
            .from('firmalar')
            .update({ goruldu: true })
            .eq('id', firmaId)
            .then(() => {});  // fire and forget
    }

    // ── Hesaplamalar ───────────────────────────────────────────────
    // Ciro hesaplamalarında iptal edilmiş siparişleri hariç tutuyoruz
    const gecerliSiparisler = siparislerTum.filter(o => !['İptal Edildi', 'cancelled', 'iptal_talep_edildi'].includes(o.siparis_durumu));
    
    const lifetimeCiro = gecerliSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const siparisYil = gecerliSiparisler.filter(o => o.siparis_tarihi >= yearStart);
    const siparisOncekYil = gecerliSiparisler.filter(o =>
        o.siparis_tarihi >= prevYearStart && o.siparis_tarihi <= prevYearEnd
    );
    const yilCiro = siparisYil.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const oncekYilCiro = siparisOncekYil.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const yillikDelta = oncekYilCiro > 0 ? Math.round(((yilCiro - oncekYilCiro) / oncekYilCiro) * 100) : null;
    const ortSepet = gecerliSiparisler.length > 0 ? lifetimeCiro / gecerliSiparisler.length : 0;

    const aktifSiparisler = siparislerTum.filter(o =>
        ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing', 'shipped'].includes(o.siparis_durumu)
    );

    // Son sipariş tarihi
    const sonSiparis = siparislerTum[0];
    const sonSiparisGunOnce = sonSiparis?.siparis_tarihi
        ? Math.floor((Date.now() - new Date(sonSiparis.siparis_tarihi).getTime()) / 86400000)
        : null;

    // Müşteri Sağlık Skoru
    let saglikSkoru = 0;
    let saglikRenk = 'red';
    let saglikLabel = 'Pasif';
    if (sonSiparisGunOnce !== null) {
        if (sonSiparisGunOnce <= 30) { saglikSkoru = 100; saglikRenk = 'emerald'; saglikLabel = 'Aktif'; }
        else if (sonSiparisGunOnce <= 60) { saglikSkoru = 75; saglikRenk = 'blue'; saglikLabel = 'Düzenli'; }
        else if (sonSiparisGunOnce <= 90) { saglikSkoru = 50; saglikRenk = 'amber'; saglikLabel = 'Uyarı'; }
        else { saglikSkoru = 25; saglikRenk = 'red'; saglikLabel = 'Risk'; }
    }

    // Aylık ciro (son 12 ay)
    const aylikMap = new Map<string, { ciro: number; adet: number }>();
    for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        aylikMap.set(key, { ciro: 0, adet: 0 });
    }
    for (const o of gecerliSiparisler) {
        if (!o.siparis_tarihi) continue;
        const d = new Date(o.siparis_tarihi);
        if (d < twelveMonthsAgo) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const ex = aylikMap.get(key);
        if (ex) {
            ex.ciro += Number(o.toplam_tutar_net || 0);
            ex.adet += 1;
        }
    }
    const aylikGrafik = Array.from(aylikMap.entries()).map(([month, v]) => ({
        month, ciro: v.ciro, adet: v.adet,
    }));

    // Sipariş durum dağılımı (lifetime)
    const durumMap = new Map<string, number>();
    for (const o of siparislerTum) {
        const k = o.siparis_durumu || 'Diğer';
        durumMap.set(k, (durumMap.get(k) ?? 0) + 1);
    }
    const durumDagilimi = Array.from(durumMap.entries()).map(([durum, adet]) => ({ durum, adet }));

    // Top 5 ürün (son 12 ay)
    const urunMap = new Map<string, { urun: any; miktar: number; tutar: number; sayi: number }>();
    for (const d of siparisDetay) {
        // İptal edilmiş siparişleri hariç tut
        if (d.siparisler && ['İptal Edildi', 'cancelled', 'iptal_talep_edildi'].includes(d.siparisler.siparis_durumu)) {
            continue;
        }
        const uid = d.urun_id;
        if (!uid) continue;
        const ex = urunMap.get(uid) || { urun: d.urunler, miktar: 0, tutar: 0, sayi: 0 };
        ex.miktar += Number(d.miktar || 0);
        ex.tutar += Number(d.toplam_fiyat || 0);
        ex.sayi += 1;
        urunMap.set(uid, ex);
    }
    const topUrunler = Array.from(urunMap.values())
        .sort((a, b) => b.tutar - a.tutar)
        .slice(0, 5);

    // Tier
    const tier = calcTier(yilCiro);

    // Müşteri olma süresi
    const membershipDays = firma.created_at
        ? Math.floor((Date.now() - new Date(firma.created_at).getTime()) / 86400000)
        : 0;
    const membershipText = membershipDays >= 365
        ? `${Math.floor(membershipDays / 365)} yıl`
        : membershipDays >= 30
            ? `${Math.floor(membershipDays / 30)} ay`
            : `${membershipDays} gün`;

    const status = (firma.status || 'ADAY') as string;
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['ADAY'];
    const statusLabel = STATUS_LABEL[status] || status;

    const etkinlikTipleri = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];
    const formDict = actDict.form || {
        typeLabel: 'Etkinlik Tipi', descriptionLabel: 'Açıklama',
        placeholder: 'Etkinlik detaylarını yazın...', submitButton: 'Ekle',
        submitting: 'Ekleniyor...', successMessage: 'Etkinlik eklendi.',
        errorMessage: 'Hata oluştu.', requiredError: 'Zorunlu alan.',
    };

    const isCustomer = ['MÜŞTERİ', 'Müşteri', 'ALT BAYİ'].includes(status);

    return (
        <div className="space-y-5">

            {/* ── Üst Bilgi Bandı (Tier + Status + Quick Actions) ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Tier Banner */}
                {isCustomer && (
                    <div className={`bg-gradient-to-r ${tier.color} px-5 py-3 text-white`}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{tier.emoji}</span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-90">{tier.label} Müşteri</p>
                                    <p className="text-[11px] opacity-80">{fmt(yilCiro)} yıllık ciro</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] opacity-80 uppercase tracking-wider">Müşterimiz</p>
                                <p className="text-sm font-bold">{membershipText}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-2xl font-bold text-slate-800">{firma.unvan}</h1>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusLabel}
                            </span>
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
                            {firma.kaynak && (
                                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                    {firma.kaynak}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {firma.sorumlu_personel?.tam_ad && (
                                <span className="flex items-center gap-1"><FiUser size={11} /> Sorumlu: <strong className="text-slate-700">{firma.sorumlu_personel.tam_ad}</strong></span>
                            )}
                            {firma.telefon && (
                                <a href={`tel:${firma.telefon}`} className="flex items-center gap-1 hover:text-blue-600"><FiPhone size={11} /> {firma.telefon}</a>
                            )}
                            {firma.email && (
                                <a href={`mailto:${firma.email}`} className="flex items-center gap-1 hover:text-blue-600 truncate"><FiMail size={11} /> {firma.email}</a>
                            )}
                            {(firma.sehir || firma.ilce) && (
                                <span className="flex items-center gap-1"><FiMapPin size={11} /> {[firma.posta_kodu, firma.ilce, firma.sehir].filter(Boolean).join(', ')}</span>
                            )}
                        </div>
                    </div>
                    <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/duzenle`}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors flex-shrink-0">
                        <FiEdit size={13} /> Düzenle
                    </Link>
                </div>
            </div>

            {/* ── 5 KPI Kartları ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-blue-200/60 p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Lifetime Ciro</p>
                        <FiDollarSign size={14} className="text-blue-500" />
                    </div>
                    <p className="text-lg font-bold text-blue-800 leading-tight">{fmt(lifetimeCiro)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{siparislerTum.length} sipariş</p>
                </div>

                <div className="rounded-xl border border-emerald-200/60 p-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Bu Yıl</p>
                        <FiTrendingUp size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-lg font-bold text-emerald-800 leading-tight">{fmt(yilCiro)}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-slate-500">{siparisYil.length} sipariş</p>
                        {yillikDelta !== null && (
                            <span className={`text-[10px] font-bold ${yillikDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {yillikDelta >= 0 ? '+' : ''}{yillikDelta}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-purple-200/60 p-4 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">Ort. Sepet</p>
                        <FiShoppingCart size={14} className="text-purple-500" />
                    </div>
                    <p className="text-lg font-bold text-purple-800 leading-tight">{fmt(ortSepet)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Sipariş başına</p>
                </div>

                <div className="rounded-xl border border-orange-200/60 p-4 bg-gradient-to-br from-orange-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Aktif Sipariş</p>
                        <FiPackage size={14} className="text-orange-500" />
                    </div>
                    <p className="text-lg font-bold text-orange-800 leading-tight">{aktifSiparisler.length}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Süreçte</p>
                </div>

                <div className={`rounded-xl border p-4 ${
                    saglikRenk === 'emerald' ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-50' :
                    saglikRenk === 'blue' ? 'border-blue-200/60 bg-gradient-to-br from-blue-50' :
                    saglikRenk === 'amber' ? 'border-amber-200/60 bg-gradient-to-br from-amber-50' :
                    'border-red-200/60 bg-gradient-to-br from-red-50'} to-white`}>
                    <div className="flex items-center justify-between mb-1">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${
                            saglikRenk === 'emerald' ? 'text-emerald-700' :
                            saglikRenk === 'blue' ? 'text-blue-700' :
                            saglikRenk === 'amber' ? 'text-amber-700' : 'text-red-700'}`}>Müşteri Sağlığı</p>
                        <FiActivity size={14} className={
                            saglikRenk === 'emerald' ? 'text-emerald-500' :
                            saglikRenk === 'blue' ? 'text-blue-500' :
                            saglikRenk === 'amber' ? 'text-amber-500' : 'text-red-500'} />
                    </div>
                    <p className={`text-lg font-bold leading-tight ${
                        saglikRenk === 'emerald' ? 'text-emerald-800' :
                        saglikRenk === 'blue' ? 'text-blue-800' :
                        saglikRenk === 'amber' ? 'text-amber-800' : 'text-red-800'}`}>{saglikLabel}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {sonSiparisGunOnce !== null ? `${sonSiparisGunOnce} gün önce` : 'Sipariş yok'}
                    </p>
                </div>
            </div>

            {/* ── İşletme Profili ── */}
            {(() => {
                const tekOz = (firma.teknik_ozellikler as any) || {};
                const hasData = !!(
                    tekOz.isletme_tipi ||
                    (Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0) ||
                    tekOz.odeme_yontemi ||
                    tekOz.rakip_kullaniyor_mu ||
                    tekOz.koltuk_sayisi != null ||
                    tekOz.notlar
                );
                if (!hasData) return null;

                const ISLETME_TIPI: Record<string, string> = {
                    kafe: 'Kafe', restoran: 'Restoran', pastane: 'Pastane',
                    dondurma: 'Dondurma Dükkanı', otel: 'Otel', catering: 'Catering',
                    bufe: 'Büfe', diger: 'Diğer',
                };
                const ODEME_YONTEMI: Record<string, string> = {
                    nakit: 'Nakit', banka_transferi: 'Banka Transferi', sepa: 'SEPA',
                };
                const GAM_LABEL: Record<string, string> = {
                    barista: 'Barista & Bar', dondurma: 'Eis & Gelato',
                    pastaci: 'Konditorei', icecek: 'Getränke',
                };
                const GAM_COLOR: Record<string, string> = {
                    barista: 'bg-amber-50 text-amber-700 border border-amber-200',
                    dondurma: 'bg-blue-50 text-blue-700 border border-blue-200',
                    pastaci: 'bg-pink-50 text-pink-700 border border-pink-200',
                    icecek: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                };

                return (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">İşletme Profili</h3>
                        <div className="flex flex-wrap gap-x-6 gap-y-2.5 items-center">
                            {tekOz.isletme_tipi && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Tür</span>
                                    <span className="text-sm font-medium text-slate-700">
                                        {ISLETME_TIPI[tekOz.isletme_tipi] ?? tekOz.isletme_tipi}
                                    </span>
                                </div>
                            )}
                            {tekOz.koltuk_sayisi != null && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Kapasite</span>
                                    <span className="text-sm font-medium text-slate-700">{tekOz.koltuk_sayisi} koltuk</span>
                                </div>
                            )}
                            {tekOz.odeme_yontemi && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Ödeme</span>
                                    <span className="text-sm font-medium text-slate-700">
                                        {ODEME_YONTEMI[tekOz.odeme_yontemi] ?? tekOz.odeme_yontemi}
                                        {tekOz.odeme_vadesi_gun != null && (
                                            <span className="text-slate-400"> · {tekOz.odeme_vadesi_gun} gün</span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {tekOz.rakip_kullaniyor_mu && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Rakip</span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                        {tekOz.rakip_marka || 'Evet'}
                                    </span>
                                </div>
                            )}
                            {Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Gam</span>
                                    {tekOz.tercihli_urun_gami.map((g: string) => (
                                        <span key={g} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${GAM_COLOR[g] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {GAM_LABEL[g] ?? g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {tekOz.notlar && (
                            <p className="mt-2.5 text-xs text-slate-500 italic border-t border-slate-100 pt-2.5">{tekOz.notlar}</p>
                        )}
                    </div>
                );
            })()}

            {/* ── Satış / Büyüme Fırsatı Kartı ── */}
            {(() => {
                const tekOz = (firma.teknik_ozellikler as any) || {};
                const isPipeline = ['ADAY', 'TEMAS EDİLDİ', 'NUMUNE VERİLDİ'].includes(status);
                const isMusteriStatus = ['MÜŞTERİ', 'Müşteri'].includes(status);

                if (isPipeline) {
                    const hasData = !!(
                        tekOz.satis_stratejisi ||
                        tekOz.tahmini_aylik_potansiyel_eur ||
                        (Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0) ||
                        firma.oncelik_puani
                    );
                    if (!hasData) return null;

                    const GAM_LABEL: Record<string, string> = {
                        barista: 'Barista & Bar', dondurma: 'Eis & Gelato',
                        pastaci: 'Konditorei', icecek: 'Getränke',
                    };
                    const GAM_COLOR: Record<string, string> = {
                        barista: 'bg-amber-50 text-amber-700 border border-amber-200',
                        dondurma: 'bg-blue-50 text-blue-700 border border-blue-200',
                        pastaci: 'bg-pink-50 text-pink-700 border border-pink-200',
                        icecek: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    };

                    return (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm px-5 py-4">
                            <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3">🎯 Satış Fırsatı</h3>
                            {tekOz.satis_stratejisi && (
                                <p className="text-sm text-slate-700 leading-snug mb-3">{tekOz.satis_stratejisi}</p>
                            )}
                            <div className="flex flex-wrap gap-2 items-center">
                                {tekOz.tahmini_aylik_potansiyel_eur && (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                        ~{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tekOz.tahmini_aylik_potansiyel_eur)}/ay
                                    </span>
                                )}
                                {Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.map((g: string) => (
                                    <span key={g} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${GAM_COLOR[g] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {GAM_LABEL[g] ?? g}
                                    </span>
                                ))}
                                {firma.oncelik_puani && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                        Öncelik {firma.oncelik_puani}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                }

                if (isMusteriStatus) {
                    const hasData = !!(
                        tekOz.crosssell_firsati ||
                        tekOz.churn_riski ||
                        tekOz.tahmini_aylik_potansiyel_eur
                    );
                    if (!hasData) return null;

                    return (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm px-5 py-4">
                            <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">🌱 Büyüme Fırsatı</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
                                {tekOz.crosssell_firsati && (
                                    <div className="flex-1 min-w-[180px]">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Cross-sell</span>
                                        <p className="text-sm text-slate-700 leading-snug">{tekOz.crosssell_firsati}</p>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 items-start">
                                    {tekOz.tahmini_aylik_potansiyel_eur && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Potansiyel</span>
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                ~{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tekOz.tahmini_aylik_potansiyel_eur)}/ay
                                            </span>
                                        </div>
                                    )}
                                    {tekOz.churn_riski && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Risk</span>
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                                ⚠ {tekOz.churn_neden || 'Churn Riski'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }

                return null;
            })()}

            {/* ── Portal Erişimi & Hesap Yönetimi ── */}
            <div className="flex justify-end">
                <PortalErigimiVerButton
                    firmaId={firmaId}
                    firmaUnvan={firma.unvan}
                    firmaEmail={firma.email}
                    yetkiliKisi={firma.yetkili_kisi}
                    locale={locale}
                    portalUsers={portalUsers}
                    firmaStatus={status}
                />
            </div>

            {/* ── Hızlı İşlemler ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2">Hızlı:</p>
                    {[
                        { label: 'Yeni Sipariş', icon: <FiPlus size={12} />, href: `/${locale}/admin/crm/firmalar/${firmaId}/siparisler/yeni`, bg: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                        { label: 'Görev Ekle', icon: <FiCheckSquare size={12} />, href: `/${locale}/admin/gorevler/ekle?firmaId=${firmaId}`, bg: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
                        { label: 'Kişi Ekle', icon: <FiUser size={12} />, href: `/${locale}/admin/crm/firmalar/${firmaId}/kisiler`, bg: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                        { label: 'Siparişleri', icon: <FiPackage size={12} />, href: `/${locale}/admin/crm/firmalar/${firmaId}/siparisler`, bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${a.bg}`}>
                            {a.icon} {a.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Grafik Bölümü ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Aylık Ciro Grafiği - 2/3 */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiBarChart2 size={14} className="text-blue-500" /> Son 12 Ay Ciro
                        </h3>
                        <span className="text-[11px] text-slate-400">Net tutar</span>
                    </div>
                    {lifetimeCiro === 0 ? (
                        <div className="py-12 text-center">
                            <div className="text-3xl mb-2">📈</div>
                            <p className="text-sm text-slate-500">Henüz sipariş yok</p>
                        </div>
                    ) : (
                        <FirmaOzetGrafik data={aylikGrafik} />
                    )}
                </div>

                {/* Sipariş Durum Dağılımı - 1/3 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPieChart size={14} className="text-purple-500" /> Sipariş Durumları
                        </h3>
                        <span className="text-[11px] text-slate-400">Tümü</span>
                    </div>
                    {durumDagilimi.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-slate-400">Sipariş yok</p>
                        </div>
                    ) : (
                        <FirmaSiparisDurumChart data={durumDagilimi} />
                    )}
                </div>
            </div>

            {/* ── Top Ürünler + Son Siparişler ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top 5 Ürün */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiAward size={14} className="text-amber-500" /> En Çok Aldığı Ürünler
                            <span className="text-[10px] font-normal text-slate-400">Son 12 ay</span>
                        </h3>
                    </div>
                    {topUrunler.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-400">Sipariş geçmişi yok</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {topUrunler.map((u: any, i: number) => {
                                const ad = u.urun?.ad?.[locale] || u.urun?.ad?.de || u.urun?.ad?.tr || 'Ürün';
                                return (
                                    <Link key={i}
                                        href={`/${locale}/admin/urun-yonetimi/urunler/${u.urun?.id || ''}`}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                            i === 0 ? 'bg-amber-100 text-amber-700' :
                                            i === 1 ? 'bg-slate-200 text-slate-700' :
                                            i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{ad}</p>
                                            <p className="text-[10px] text-slate-400">{u.miktar} adet · {u.sayi} sipariş</p>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-700 flex-shrink-0">{fmt(u.tutar)}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Son 5 Sipariş */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPackage size={14} className="text-orange-500" /> Son Siparişler
                        </h3>
                        <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/siparisler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {siparislerTum.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-400">Sipariş yok</p>
                            <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/siparisler/yeni`}
                                className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-semibold">
                                <FiPlus size={11} /> Yeni Sipariş
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {siparislerTum.slice(0, 5).map((s: any) => (
                                <Link key={s.id}
                                    href={`/${locale}/admin/crm/firmalar/${firmaId}/siparisler/${s.id}`}
                                    className="block px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono font-bold text-slate-700">
                                                    #{s.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${SIPARIS_STATUS_CHIP[s.siparis_durumu] || 'bg-slate-100 text-slate-600'}`}>
                                                    {s.siparis_durumu}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(s.siparis_tarihi).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                                            {fmt(s.toplam_tutar_net)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Etkinlik + Sağ Bilgi Kolonu ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Sol: Etkinlik Akışı + Form */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Etkinlik Ekle */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Etkinlik Ekle</h3>
                        <EtkinlikEkleForm
                            firmaId={firmaId}
                            locale={locale}
                            etkinlikTipleri={etkinlikTipleri}
                            dict={formDict}
                        />
                    </div>

                    {/* Etkinlik Akışı */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <FiActivity size={14} className="text-blue-500" /> Etkinlik Akışı
                            </h3>
                            <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/etkinlikler`}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                                Tümü <FiExternalLink size={9} />
                            </Link>
                        </div>
                        {aktiviteler.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-sm text-slate-400">Henüz etkinlik yok</p>
                            </div>
                        ) : (
                            <div className="px-4 py-3 space-y-2">
                                {aktiviteler.map((etk: any, i: number) => (
                                    <div key={etk.id} className="flex gap-3">
                                        <div className="flex flex-col items-center flex-shrink-0">
                                            <div className="text-base leading-none w-7 h-7 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                                                {ETK_ICON[etk.etkinlik_tipi] || '📌'}
                                            </div>
                                            {i < aktiviteler.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                                        </div>
                                        <div className="flex-1 min-w-0 pb-3">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-[11px] font-bold text-slate-600">{etk.etkinlik_tipi}</span>
                                                <span className="text-[10px] text-slate-400">{timeAgo(etk.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-snug">{etk.aciklama}</p>
                                            {etk.olusturan_personel?.tam_ad && (
                                                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <FiUser size={9} />{etk.olusturan_personel.tam_ad}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ: Görevler + Kişiler + Bağlantılar */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Görevler */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <FiCheckSquare size={14} className="text-teal-500" /> Görevler
                            </h3>
                            <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                                Tümü <FiExternalLink size={9} />
                            </Link>
                        </div>
                        {acikGorevler.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-xs text-slate-400">Açık görev yok</p>
                                {tamamlananGorevSayisi > 0 && (
                                    <p className="text-[10px] text-emerald-600 mt-1">✓ {tamamlananGorevSayisi} tamamlanmış</p>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {acikGorevler.slice(0, 5).map((g: any) => {
                                    const isOverdue = g.son_tarih && g.son_tarih < todayISO;
                                    return (
                                        <div key={g.id} className={`px-4 py-2 ${isOverdue ? 'bg-red-50/40' : ''}`}>
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <p className={`text-xs font-semibold truncate flex-1 ${isOverdue ? 'text-red-700' : 'text-slate-700'}`}>
                                                    {g.baslik}
                                                </p>
                                                {g.oncelik && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${g.oncelik === 'Yüksek' || g.oncelik === 'Acil' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                                        {g.oncelik}
                                                    </span>
                                                )}
                                            </div>
                                            {g.son_tarih && (
                                                <p className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
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

                    {/* Kişiler */}
                    {kisiler.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FiUser size={14} className="text-purple-500" /> İlgili Kişiler
                                </h3>
                                <Link href={`/${locale}/admin/crm/firmalar/${firmaId}/kisiler`}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                                    Tümü <FiExternalLink size={9} />
                                </Link>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {kisiler.map((k: any) => (
                                    <div key={k.id} className="px-4 py-2.5 flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                            {(k.ad_soyad || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{k.ad_soyad}</p>
                                            {k.unvan && <p className="text-[10px] text-slate-400 truncate">{k.unvan}</p>}
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                                                {k.telefon && (
                                                    <a href={`tel:${k.telefon}`} className="hover:text-blue-600 flex items-center gap-0.5">
                                                        <FiPhone size={8} />{k.telefon}
                                                    </a>
                                                )}
                                                {k.email && (
                                                    <a href={`mailto:${k.email}`} className="hover:text-blue-600 truncate">
                                                        <FiMail size={8} className="inline" /> {k.email}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bağlantılar */}
                    {(firma.instagram_url || firma.facebook_url || firma.linkedin_url || firma.web_url || firma.google_maps_url) && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Bağlantılar</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {firma.instagram_url && (
                                    <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg text-[11px] font-medium transition-colors">
                                        <FaInstagram size={11} /> IG
                                    </a>
                                )}
                                {firma.facebook_url && (
                                    <a href={firma.facebook_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-medium transition-colors">
                                        <FaFacebook size={11} /> FB
                                    </a>
                                )}
                                {firma.linkedin_url && (
                                    <a href={firma.linkedin_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-medium transition-colors">
                                        <FaLinkedin size={11} /> LinkedIn
                                    </a>
                                )}
                                {firma.web_url && (
                                    <a href={firma.web_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-medium transition-colors">
                                        <FaGlobe size={11} /> Web
                                    </a>
                                )}
                                {firma.google_maps_url && (
                                    <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-[11px] font-medium transition-colors">
                                        <FaMapMarkedAlt size={11} /> Harita
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Etiketler */}
                    {firma.etiketler && firma.etiketler.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <FiTag size={11} /> Etiketler
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {firma.etiketler.map((tag: string) => (
                                    <span key={tag} className="text-[11px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                        {tag.replace('#', '').replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Şubeler */}
                    {subeler.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                                Şubeler ({subeler.length})
                            </h3>
                            <div className="space-y-1">
                                {subeler.map((s: any) => (
                                    <Link key={s.id}
                                        href={`/${locale}/admin/crm/firmalar/${s.id}`}
                                        className="flex items-center justify-between text-xs text-slate-700 hover:text-blue-600 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-slate-400">└</span>{s.unvan}
                                        </span>
                                        {s.status && (
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[s.status]?.bg || 'bg-slate-100'} ${STATUS_COLORS[s.status]?.text || 'text-slate-600'}`}>
                                                {STATUS_LABEL[s.status] || s.status}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
