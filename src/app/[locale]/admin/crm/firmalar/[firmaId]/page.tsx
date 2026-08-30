import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
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
import { AltBayiDetayHub } from '@/components/admin/crm/AltBayiDetayHub';
import { MusteriDetayHub } from '@/components/admin/crm/MusteriDetayHub';

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
    let portalUsers = (portalUsersRes.data ?? []) as any[];

    // Fetch auth details (last_sign_in_at, email) for portal users
    let supabaseAdmin: ReturnType<typeof createSupabaseServiceClient> | null = null;
    try {
        supabaseAdmin = createSupabaseServiceClient();
    } catch {
        supabaseAdmin = null;
    }

    if (supabaseAdmin && portalUsers.length > 0) {
        try {
            const authUserPromises = portalUsers.map(p => supabaseAdmin!.auth.admin.getUserById(p.id));
            const authUserResults = await Promise.all(authUserPromises);
            portalUsers = portalUsers.map((p, idx) => {
                const u = authUserResults[idx]?.data?.user;
                return {
                    ...p,
                    email: u?.email ?? null,
                    last_sign_in_at: u?.last_sign_in_at ?? null,
                };
            });
        } catch (err) {
            console.error('Error fetching portal user auth details:', err);
        }
    }

    let ustBayi: { id: string; unvan: string } | null = null;
    if (firma.ust_bayi_firma_id) {
        try {
            const { data: ustBayiData } = await supabase
                .from('firmalar')
                .select('id, unvan')
                .eq('id', firma.ust_bayi_firma_id)
                .single();
            ustBayi = ustBayiData || null;
        } catch {
            ustBayi = null;
        }
    }

    // Auto-mark as seen when admin views the firm
    if (firma.goruldu === false && firma.kaynak === 'Web') {
        supabase
            .from('firmalar')
            .update({ goruldu: true })
            .eq('id', firmaId)
            .then(() => {});  // fire and forget
    }

    const isFirmaAltBayi = firma.ticari_tip === 'alt_bayi' || firma.kategori === 'Alt Bayi';
    let bayiMusterileri: any[] = [];
    let bayiMusteriSiparisleri: any[] = [];
    let bayiStoklari: any[] = [];

    if (isFirmaAltBayi) {
        try {
            const [bmRes, bsRes] = await Promise.all([
                (supabase as any)
                    .from('firmalar')
                    .select('id, unvan, status, sehir, ilce, telefon, created_at')
                    .eq('ust_bayi_firma_id', firmaId)
                    .order('unvan'),
                (supabase as any)
                    .from('alt_bayi_stoklari')
                    .select(`
                        id, miktar, kritik_stok_seviyesi, son_sayim_tarihi,
                        urunler ( id, ad, stok_kodu, ana_resim_url )
                    `)
                    .eq('bayi_firma_id', firmaId)
            ]);

            bayiMusterileri = bmRes.data || [];
            bayiStoklari = bsRes.data || [];

            if (bayiMusterileri.length > 0) {
                const mIds = bayiMusterileri.map((m: any) => m.id);
                const { data: bmsData } = await supabase
                    .from('siparisler')
                    .select('id, firma_id, toplam_tutar_net, toplam_tutar_brut, siparis_durumu, siparis_tarihi')
                    .in('firma_id', mIds);
                bayiMusteriSiparisleri = bmsData || [];
            }
        } catch (err) {
            console.error('Alt Bayi verileri yüklenirken hata:', err);
        }
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

    // ── EĞER ALT BAYİ İSE 360° ŞİRKET & BAYİ KONSOLU RENDER ET ──
    if (isFirmaAltBayi) {
        return (
            <AltBayiDetayHub
                firma={firma}
                bayiMusterileri={bayiMusterileri}
                bayiMusteriSiparisleri={bayiMusteriSiparisleri}
                bayiStoklari={bayiStoklari}
                bayiIkmalSiparisleri={siparislerTum}
                portalUsers={portalUsers}
                locale={locale}
            />
        );
    }

    return (
        <MusteriDetayHub
            firma={firma}
            siparisler={siparislerTum}
            gorevler={acikGorevler}
            kisiler={kisiler}
            aktiviteler={aktiviteler}
            portalUsers={portalUsers}
            ustBayi={ustBayi}
            locale={locale}
            isPortal={false}
            etkinlikEkleFormSlot={
                <EtkinlikEkleForm
                    firmaId={firmaId}
                    locale={locale}
                    etkinlikTipleri={etkinlikTipleri}
                    dict={formDict}
                />
            }
        />
    );
}
