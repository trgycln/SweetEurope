import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { FiArrowLeft, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { FaInstagram, FaGlobe, FaLinkedin, FaMapMarkedAlt } from 'react-icons/fa';
import MusteriTabs from './MusteriTabs';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'MÜŞTERİ':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'Müşteri':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'NUMUNE VERİLDİ': { bg: 'bg-cyan-100',   text: 'text-cyan-800',   dot: 'bg-cyan-500' },
    'TEMAS EDİLDİ':   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
    'ADAY':           { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-400' },
    'REDDEDİLDİ':     { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-400' },
};

const STATUS_LABEL: Record<string, string> = {
    'MÜŞTERİ': 'Müşteri',
    'Müşteri': 'Müşteri',
    'NUMUNE VERİLDİ': 'Numune Verildi',
    'TEMAS EDİLDİ': 'Temas Edildi',
    'ADAY': 'Aday',
    'REDDEDİLDİ': 'Reddedildi',
};

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string) {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export default async function MusteriLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string; firmaId: string }>
}) {
    const { locale: localeStr, firmaId } = await params;
    const locale = localeStr as Locale;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    const { data: firma } = await (supabase as any)
        .from('firmalar')
        .select('*')
        .eq('id', firmaId)
        .single();

    const isAuthorized = Boolean(
        firma && (
            firma.sahip_id === user.id ||
            (profile?.firma_id && firma.ust_bayi_firma_id === profile.firma_id)
        )
    );

    if (!firma || !isAuthorized) {
        notFound();
    }

    const status = (firma.status || 'ADAY') as string;
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['ADAY'];
    const statusLabel = STATUS_LABEL[status] || status;
    const initials = getInitials(firma.unvan || 'F');
    const avatarColor = getAvatarColor(firma.unvan || '');

    return (
        <div className="space-y-0">
            {/* Geri Dön Butonu */}
            <div className="mb-4">
                <Link
                    href={`/${locale}/portal/musterilerim`}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                    <FiArrowLeft size={14} /> Müşteri Portföyüne Dön
                </Link>
            </div>

            {/* Üst Başlık Kartı (Admin ile Birebir Aynı) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-0">
                <div className={`h-1.5 w-full ${statusStyle.dot}`} />

                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm`}>
                        {initials}
                    </div>

                    {/* Bilgiler */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-800 truncate">{firma.unvan}</h1>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusLabel}
                            </span>
                            {firma.kategori && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {firma.kategori}
                                </span>
                            )}
                        </div>

                        {/* İletişim Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {firma.telefon && (
                                <a href={`tel:${firma.telefon}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-mono">
                                    <FiPhone size={11} /> {firma.telefon}
                                </a>
                            )}
                            {firma.email && (
                                <a href={`mailto:${firma.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                    <FiMail size={11} /> {firma.email}
                                </a>
                            )}
                            {(firma.ilce || firma.sehir) && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <FiMapPin size={11} /> {[firma.ilce, firma.sehir].filter(Boolean).join(', ')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Hızlı Butonlar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {firma.instagram_url && (
                            <a
                                href={firma.instagram_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 flex items-center justify-center transition-colors"
                                title="Instagram"
                            >
                                <FaInstagram size={15} />
                            </a>
                        )}
                        {firma.web_url && (
                            <a
                                href={firma.web_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                                title="Website"
                            >
                                <FaGlobe size={15} />
                            </a>
                        )}
                        {firma.google_maps_url && (
                            <a
                                href={firma.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                                title="Google Haritalar"
                            >
                                <FaMapMarkedAlt size={15} />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Sekmeler & Sayfa İçeriği */}
            <div className="mt-4">
                <MusteriTabs
                    firmaId={firmaId}
                    locale={locale}
                />
                <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl shadow-sm p-5 sm:p-7">
                    {children}
                </div>
            </div>
        </div>
    );
}
