import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { FiMapPin, FiPhone, FiMail, FiGlobe, FiInfo, FiBriefcase, FiDollarSign, FiTag, FiTrendingUp, FiTarget, FiUser } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaLinkedin, FaMapMarkedAlt } from 'react-icons/fa';
import Link from 'next/link';

export default async function FirmaDetaylarPage({
    params
}: {
    params: Promise<{ firmaId: string; locale: Locale }>
}) {
    const { firmaId, locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: firma, error } = await supabase
        .from('firmalar')
        .select(`
            *,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad),
            olusturan:profiller!firmalar_created_by_fkey(tam_ad)
        `)
        .eq('id', firmaId)
        .single();

    if (error || !firma) {
        notFound();
    }

    const tekOz = firma.teknik_ozellikler || {};
    
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FiInfo className="text-blue-500" /> Kapsamlı Firma Detayları
                </h2>
                <Link
                    href={`/${locale}/admin/crm/firmalar/${firmaId}/duzenle`}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition"
                >
                    Düzenle
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* İletişim & Adres Bilgileri */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FiMapPin className="text-slate-400" /> İletişim & Adres
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Yetkili Kişi</span>
                            <span className="text-slate-800 font-medium">{firma.yetkili_kisi || 'Belirtilmemiş'}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Açık Adres</span>
                            <span className="text-slate-800">{firma.adres || 'Adres girilmemiş'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">İlçe / Şehir</span>
                                <span className="text-slate-800">{[firma.ilce, firma.sehir].filter(Boolean).join(', ') || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Posta Kodu</span>
                                <span className="text-slate-800">{firma.posta_kodu || '-'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Telefon</span>
                                <span className="text-slate-800">{firma.telefon || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">E-posta</span>
                                <span className="text-slate-800 break-all">{firma.email || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticari & Finansal Bilgiler */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FiBriefcase className="text-slate-400" /> Ticari Bilgiler
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Ticari Tip</span>
                                <span className="text-slate-800 font-medium capitalize">{firma.ticari_tip || 'Müşteri'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Fiyat Kademesi</span>
                                <span className="text-slate-800 font-medium">{firma.pricing_tier ? firma.pricing_tier.replace('_', ' ') : 'Atanmamış'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Vergi Dairesi</span>
                                <span className="text-slate-800">{firma.vergi_dairesi || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Vergi No</span>
                                <span className="text-slate-800 font-mono">{firma.vergi_no || '-'}</span>
                            </div>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">IBAN</span>
                            <span className="text-slate-800 font-mono">{firma.iban || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Ödeme Yöntemi</span>
                                <span className="text-slate-800">{ODEME_YONTEMI[tekOz.odeme_yontemi] || tekOz.odeme_yontemi || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Ödeme Vadesi</span>
                                <span className="text-slate-800">{tekOz.odeme_vadesi_gun != null ? `${tekOz.odeme_vadesi_gun} gün` : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* İşletme Profili & Diğer */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <FiTag className="text-slate-400" /> İşletme Profili
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">İşletme Tipi</span>
                                <span className="text-slate-800">{ISLETME_TIPI[tekOz.isletme_tipi] || tekOz.isletme_tipi || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Koltuk Sayısı</span>
                                <span className="text-slate-800">{tekOz.koltuk_sayisi ? `${tekOz.koltuk_sayisi} koltuk` : '-'}</span>
                            </div>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Tercih Edilen Ürün Gamı</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0 ? (
                                    tekOz.tercihli_urun_gami.map((g: string) => (
                                        <span key={g} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
                                            {GAM_LABEL[g] || g}
                                        </span>
                                    ))
                                ) : <span className="text-slate-800">-</span>}
                            </div>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Rakip Kullanımı</span>
                            {tekOz.rakip_kullaniyor_mu ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-bold inline-block mt-0.5">
                                    Evet {tekOz.rakip_marka && `(${tekOz.rakip_marka})`}
                                </span>
                            ) : <span className="text-slate-800">Hayır / Bilinmiyor</span>}
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400 uppercase mb-0.5">Sipariş Periyodu</span>
                            <span className="text-slate-800">{tekOz.siparis_periyodu_gun ? `${tekOz.siparis_periyodu_gun} günde bir` : '-'}</span>
                        </div>
                    </div>
                </div>

                {/* CRM Notları ve Satış Stratejisi - Geniş Kart */}
                <div className="md:col-span-2 lg:col-span-3 bg-amber-50/50 rounded-xl p-5 border border-amber-200">
                    <h3 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2">
                        <FiTarget className="text-amber-500" /> Satış Stratejisi & CRM Notları
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <div>
                                <span className="block text-xs font-bold text-amber-600 uppercase mb-1">Satış Stratejisi / Giriş Noktası</span>
                                <div className="p-3 bg-white rounded-lg border border-amber-100 text-sm text-slate-700 min-h-[60px] whitespace-pre-wrap">
                                    {tekOz.satis_stratejisi || 'Strateji notu girilmemiş.'}
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-amber-600 uppercase mb-1">Genel Notlar & İpuçları</span>
                                <div className="p-3 bg-white rounded-lg border border-amber-100 text-sm text-slate-700 min-h-[60px] whitespace-pre-wrap italic">
                                    {tekOz.notlar || 'Genel not bulunmuyor.'}
                                </div>
                            </div>
                            {tekOz.crosssell_firsati && (
                                <div>
                                    <span className="block text-xs font-bold text-amber-600 uppercase mb-1">Cross-Sell Fırsatı</span>
                                    <div className="p-3 bg-white rounded-lg border border-amber-100 text-sm text-slate-700 whitespace-pre-wrap">
                                        {tekOz.crosssell_firsati}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs font-semibold text-amber-600 uppercase mb-0.5">Tahmini Aylık Potansiyel</span>
                                <span className="text-lg font-bold text-emerald-700">
                                    {tekOz.tahmini_aylik_potansiyel_eur 
                                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tekOz.tahmini_aylik_potansiyel_eur) 
                                        : '-'}
                                </span>
                            </div>
                            
                            {tekOz.churn_riski && (
                                <div>
                                    <span className="block text-xs font-semibold text-red-500 uppercase mb-0.5">Churn Riski</span>
                                    <div className="text-sm font-bold text-red-700 bg-red-100 px-3 py-2 rounded-lg border border-red-200">
                                        ⚠ {tekOz.churn_neden || 'Risk belirtilmiş ama neden girilmemiş'}
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="block text-xs font-semibold text-amber-600 uppercase mb-1.5">Etiketler</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {Array.isArray(firma.etiketler) && firma.etiketler.length > 0 ? (
                                        firma.etiketler.map((e: string) => (
                                            <span key={e} className="px-2 py-0.5 bg-white border border-amber-200 text-slate-600 rounded-md text-xs">
                                                {e}
                                            </span>
                                        ))
                                    ) : <span className="text-sm text-slate-500">Etiket yok</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sistem Bilgileri & Sosyal Medya */}
                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-center">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sosyal Medya & Bağlantılar</h3>
                        <div className="flex flex-wrap gap-3">
                            {firma.instagram_url ? (
                                <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-pink-300 hover:text-pink-600 transition text-sm font-medium text-slate-600">
                                    <FaInstagram size={16} className="text-pink-500" /> Instagram
                                </a>
                            ) : <span className="px-3 py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">Instagram Yok</span>}
                            
                            {firma.linkedin_url ? (
                                <a href={firma.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition text-sm font-medium text-slate-600">
                                    <FaLinkedin size={16} className="text-blue-600" /> LinkedIn
                                </a>
                            ) : <span className="px-3 py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">LinkedIn Yok</span>}
                            
                            {firma.facebook_url ? (
                                <a href={firma.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-700 transition text-sm font-medium text-slate-600">
                                    <FaFacebook size={16} className="text-blue-700" /> Facebook
                                </a>
                            ) : <span className="px-3 py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">Facebook Yok</span>}

                            {firma.web_url ? (
                                <a href={firma.web_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-800 transition text-sm font-medium text-slate-600">
                                    <FiGlobe size={16} className="text-slate-700" /> Website
                                </a>
                            ) : <span className="px-3 py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">Web Yok</span>}

                            {firma.google_maps_url ? (
                                <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-green-400 hover:text-green-700 transition text-sm font-medium text-slate-600">
                                    <FaMapMarkedAlt size={16} className="text-green-600" /> Harita
                                </a>
                            ) : <span className="px-3 py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">Harita Yok</span>}
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sistem Kaydı</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="text-slate-500">Oluşturan</span>
                                <span className="font-medium text-slate-800">{firma.olusturan?.tam_ad || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="text-slate-500">Sorumlu Personel</span>
                                <span className="font-medium text-slate-800">{firma.sorumlu_personel?.tam_ad || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-slate-100">
                                <span className="text-slate-500">Kayıt Tarihi</span>
                                <span className="font-medium text-slate-800">{new Date(firma.created_at).toLocaleDateString(locale)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500">Kaynak</span>
                                <span className="font-medium text-slate-800">{firma.kaynak || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
