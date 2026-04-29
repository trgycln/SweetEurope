// src/app/[locale]/admin/crm/firmalar/[firmaId]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiEdit, FiPhone, FiMail, FiUser, FiTag, FiCalendar, FiExternalLink } from 'react-icons/fi';
import { FaInstagram, FaGlobe, FaLinkedin, FaMapMarkedAlt } from 'react-icons/fa';
import EtkinlikEkleForm from './etkinlikler/EtkinlikEkleForm';
import { getDictionary } from '@/dictionaries';

interface PageProps {
    params: Promise<{ firmaId: string; locale: Locale }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'MÜŞTERİ':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'NUMUNE VERİLDİ': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    'TEMAS EDİLDİ':   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
    'ADAY':           { bg: 'bg-amber-100',   text: 'text-amber-800',  dot: 'bg-amber-400' },
    'REDDEDİLDİ':     { bg: 'bg-red-100',     text: 'text-red-800',    dot: 'bg-red-400' },
};

const STATUS_LABEL: Record<string, string> = {
    'MÜŞTERİ': 'Müşteri',
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

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

export default async function FirmaOzetPage({ params }: PageProps) {
    const { firmaId, locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const dict = await getDictionary(locale);
    const actDict = dict.adminDashboard?.crmPage?.activities || {};

    const [firmaRes, aktivitelerRes, kisilerRes, subelerRes] = await Promise.all([
        supabase.from('firmalar')
            .select('*, sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)')
            .eq('id', firmaId)
            .single(),
        supabase.from('etkinlikler')
            .select('id, etkinlik_tipi, aciklama, created_at, olusturan_personel:profiller!etkinlikler_olusturan_personel_id_fkey(tam_ad)')
            .eq('firma_id', firmaId)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase.from('dis_kontaklar')
            .select('id, ad_soyad, unvan, email, telefon')
            .eq('firma_id', firmaId)
            .limit(4),
        supabase.from('firmalar')
            .select('id, unvan')
            .eq('parent_firma_id', firmaId)
            .order('unvan'),
    ]);

    if (firmaRes.error || !firmaRes.data) notFound();
    const firma = firmaRes.data as any;
    const aktiviteler = aktivitelerRes.data || [];
    const kisiler = kisilerRes.data || [];
    const subeler = subelerRes.data || [];

    const status = (firma.status || 'ADAY') as string;
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['ADAY'];
    const statusLabel = STATUS_LABEL[status] || status;

    const etkinlikTipleri = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];
    const formDict = actDict.form || {
        typeLabel: 'Etkinlik Tipi',
        descriptionLabel: 'Açıklama',
        placeholder: 'Etkinlik detaylarını yazın...',
        submitButton: 'Ekle',
        submitting: 'Ekleniyor...',
        successMessage: 'Etkinlik eklendi.',
        errorMessage: 'Hata oluştu.',
        requiredError: 'Zorunlu alan.',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column: Activity Feed */}
            <div className="lg:col-span-3 space-y-5">
                {/* Add Activity */}
                <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Etkinlik Ekle</h3>
                    <EtkinlikEkleForm
                        firmaId={firmaId}
                        locale={locale}
                        etkinlikTipleri={etkinlikTipleri}
                        dict={formDict}
                    />
                </div>

                {/* Recent Activity Stream */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700">Son Etkinlikler</h3>
                        <Link
                            href={`/${locale}/admin/crm/firmalar/${firmaId}/etkinlikler`}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            Tümünü Gör <FiExternalLink size={10} />
                        </Link>
                    </div>

                    {aktiviteler.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-slate-400 text-sm">Henüz etkinlik yok.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {aktiviteler.map((etk: any) => (
                                <div key={etk.id} className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-lg leading-none mt-0.5 flex-shrink-0">
                                        {ETK_ICON[etk.etkinlik_tipi] || '📌'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] font-semibold text-slate-500">{etk.etkinlik_tipi}</span>
                                            <span className="text-[10px] text-slate-400">{timeAgo(etk.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-snug line-clamp-2">{etk.aciklama}</p>
                                        {etk.olusturan_personel?.tam_ad && (
                                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                <FiUser size={9} />{etk.olusturan_personel.tam_ad}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contacts mini list */}
                {kisiler.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-700">İlgili Kişiler</h3>
                            <Link
                                href={`/${locale}/admin/crm/firmalar/${firmaId}/kisiler`}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                Tümünü Gör <FiExternalLink size={10} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {kisiler.map((k: any) => (
                                <div key={k.id} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {(k.ad_soyad || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{k.ad_soyad}</p>
                                        {k.unvan && <p className="text-[11px] text-slate-400 truncate">{k.unvan}</p>}
                                        {k.telefon && (
                                            <a href={`tel:${k.telefon}`} className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 mt-0.5">
                                                <FiPhone size={9} />{k.telefon}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Firma Info */}
            <div className="lg:col-span-2 space-y-4">
                {/* Edit Button */}
                <Link
                    href={`/${locale}/admin/crm/firmalar/${firmaId}/duzenle`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
                >
                    <FiEdit size={14} /> Firma Bilgilerini Düzenle
                </Link>

                {/* Status Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Genel Bilgiler</h3>

                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {statusLabel}
                        </span>
                        {firma.kategori && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                Kat. {firma.kategori}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 pt-1">
                        {firma.sorumlu_personel?.tam_ad && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FiUser size={13} className="text-slate-400 flex-shrink-0" />
                                <span className="truncate">{firma.sorumlu_personel.tam_ad}</span>
                            </div>
                        )}
                        {firma.telefon && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FiPhone size={13} className="text-slate-400 flex-shrink-0" />
                                <a href={`tel:${firma.telefon}`} className="hover:text-blue-600">{firma.telefon}</a>
                            </div>
                        )}
                        {firma.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FiMail size={13} className="text-slate-400 flex-shrink-0" />
                                <a href={`mailto:${firma.email}`} className="hover:text-blue-600 truncate">{firma.email}</a>
                            </div>
                        )}
                        {firma.son_etkilesim_tarihi && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FiCalendar size={13} className="text-slate-400 flex-shrink-0" />
                                <span>Son temas: {new Date(firma.son_etkilesim_tarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                        )}
                        {firma.kaynak && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="text-slate-400 text-xs">Kaynak:</span>
                                <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">{firma.kaynak}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags */}
                {firma.etiketler && firma.etiketler.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
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

                {/* Quick Links */}
                {(firma.instagram_url || firma.linkedin_url || firma.web_url || firma.google_maps_url) && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Bağlantılar</h3>
                        <div className="flex flex-wrap gap-2">
                            {firma.instagram_url && (
                                <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg text-xs font-medium transition-colors">
                                    <FaInstagram size={12} /> Instagram
                                </a>
                            )}
                            {firma.linkedin_url && (
                                <a href={firma.linkedin_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors">
                                    <FaLinkedin size={12} /> LinkedIn
                                </a>
                            )}
                            {firma.web_url && (
                                <a href={firma.web_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors">
                                    <FaGlobe size={12} /> Web
                                </a>
                            )}
                            {firma.google_maps_url && (
                                <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors">
                                    <FaMapMarkedAlt size={12} /> Harita
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Branches */}
                {subeler.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                            Şubeler ({subeler.length})
                        </h3>
                        <div className="space-y-1.5">
                            {subeler.map((s: any) => (
                                <Link
                                    key={s.id}
                                    href={`/${locale}/admin/crm/firmalar/${s.id}`}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-slate-400 text-xs">└</span>
                                    {s.unvan}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
