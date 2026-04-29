// src/app/[locale]/admin/crm/firmalar/[firmaId]/layout.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import React from 'react';
import FirmaTabs from './FirmaTabs';
import FirmaChainBadge from './FirmaChainBadge';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import { FiArrowLeft, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { FaInstagram, FaGlobe, FaLinkedin } from 'react-icons/fa';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'MÜŞTERİ':       { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
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

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string) {
    const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-amber-500','bg-rose-500','bg-teal-500','bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export default async function FirmaDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ firmaId: string; locale: Locale }>;
}) {
    const { firmaId, locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: firma, error: firmaError } = await supabase
        .from('firmalar')
        .select('id, unvan, kategori, ticari_tip, status, telefon, email, sehir, ilce, instagram_url, linkedin_url, web_url, google_maps_url, son_etkilesim_tarihi, parent_firma_id')
        .eq('id', firmaId)
        .single();

    // Mark as seen
    await supabase
        .from('firmalar')
        .update({ goruldu: true })
        .eq('id', firmaId)
        .eq('goruldu', false);

    if (firmaError || !firma) notFound();

    // Fetch parent firm if this is a branch
    let parentFirma: { id: string; unvan: string } | null = null;
    if (firma.parent_firma_id) {
        const { data: pf } = await supabase
            .from('firmalar')
            .select('id, unvan')
            .eq('id', firma.parent_firma_id)
            .single();
        parentFirma = pf ?? null;
    }

    // Fetch sub-firms (branches) if this is a parent
    const { data: subFirmalar } = await supabase
        .from('firmalar')
        .select('id, unvan, sehir, ilce')
        .eq('parent_firma_id', firmaId);
    const subeCount = subFirmalar?.length ?? 0;

    const status = (firma.status || 'ADAY') as string;
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['ADAY'];
    const statusLabel = STATUS_LABEL[status] || status;
    const initials = getInitials(firma.unvan || 'F');
    const avatarColor = getAvatarColor(firma.unvan || '');

    const tabLabels = {
        generalInfo: 'Özet',
        activities: 'Etkinlik Akışı',
        contacts: 'İlgili Kişiler',
        orders: 'Siparişler',
        tasks: 'Görevler',
    };

    const extraTabs = (firma.ticari_tip === 'alt_bayi' || firma.kategori === 'Alt Bayi')
        ? [{ name: 'Müşterileri', href: `/${locale}/admin/crm/firmalar/${firmaId}/musteriler` }]
        : [];

    return (
        <div className="space-y-0">
            {/* Back Link */}
            <div className="mb-4">
                <Link
                    href={`/${locale}/admin/crm/firmalar`}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <FiArrowLeft size={14} /> Firma Listesi
                </Link>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-0">
                {/* Status Band */}
                <div className={`h-1.5 w-full ${statusStyle.dot}`} />

                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                        {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-800 truncate">{firma.unvan}</h1>
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusLabel}
                            </span>
                            {firma.kategori && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    Kat. {firma.kategori}
                                </span>
                            )}
                            {/* Zincir badge — ana firma */}
                            {subeCount > 0 && (
                                <FirmaChainBadge
                                    count={subeCount}
                                    locale={locale}
                                    subeler={subFirmalar ?? []}
                                />
                            )}
                            {/* Şube badge — şube firma */}
                            {parentFirma && (
                                <>
                                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                        Şube
                                    </span>
                                    <Link
                                        href={`/${locale}/admin/crm/firmalar/${parentFirma.id}`}
                                        className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                    >
                                        ↑ Ana: {parentFirma.unvan}
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Contact meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {firma.telefon && (
                                <a href={`tel:${firma.telefon}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
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

                    {/* Quick Links */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {firma.instagram_url && (
                            <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 flex items-center justify-center transition-colors"
                                title="Instagram">
                                <FaInstagram size={15} />
                            </a>
                        )}
                        {firma.linkedin_url && (
                            <a href={firma.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                                title="LinkedIn">
                                <FaLinkedin size={15} />
                            </a>
                        )}
                        {firma.web_url && (
                            <a href={firma.web_url} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                                title="Website">
                                <FaGlobe size={15} />
                            </a>
                        )}
                        {firma.google_maps_url && (
                            <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center transition-colors"
                                title="Google Maps">
                                <FiMapPin size={15} />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs + Content */}
            <div className="mt-4">
                <FirmaTabs
                    firmaId={firmaId}
                    locale={locale}
                    labels={tabLabels}
                    extraTabs={extraTabs}
                />
                <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl shadow-sm p-5 sm:p-7">
                    {children}
                </div>
            </div>
        </div>
    );
}
