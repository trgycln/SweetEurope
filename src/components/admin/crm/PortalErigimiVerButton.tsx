'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus, FiKey, FiClock, FiAlertCircle } from 'react-icons/fi';
import { PortalErigimiVerModal } from './PortalErigimiVerModal';

export interface PortalUserItem {
    id: string;
    tam_ad: string | null;
    rol: string;
    email?: string | null;
    last_sign_in_at?: string | null;
}

interface Props {
    firmaId: string;
    firmaUnvan: string;
    firmaEmail: string | null;
    yetkiliKisi: string | null;
    locale: string;
    portalUsers?: PortalUserItem[];
    firmaStatus?: string;
}

function formatLastLogin(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 2) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function PortalErigimiVerButton({
    firmaId,
    firmaUnvan,
    firmaEmail,
    yetkiliKisi,
    locale,
    portalUsers = [],
    firmaStatus,
}: Props) {
    const [modalAcik, setModalAcik] = useState(false);
    const router = useRouter();

    const hasPortalAccess = portalUsers.length > 0;

    // Find latest login
    const latestSignIn = portalUsers
        .map(u => u.last_sign_in_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

    const hasEverLoggedIn = Boolean(latestSignIn);

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {hasPortalAccess ? (
                    hasEverLoggedIn ? (
                        <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Portal Aktif ({portalUsers.length} Yetkili)</span>
                            </div>
                            <span className="text-[11px] text-emerald-700 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                                <FiClock size={11} className="text-emerald-600" />
                                Son Giriş: <strong>{formatLastLogin(latestSignIn)}</strong>
                            </span>
                            <button
                                onClick={() => setModalAcik(true)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm ml-1"
                            >
                                <FiKey size={12} />
                                Şifre / Erişim Yönet
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>Portal Tanımlı ({portalUsers.length} Yetkili)</span>
                            </div>
                            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                                <FiAlertCircle size={11} className="text-amber-600" />
                                Henüz giriş yapmadı
                            </span>
                            <button
                                onClick={() => setModalAcik(true)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm ml-1"
                            >
                                <FiKey size={12} />
                                Şifre / Erişim Yönet
                            </button>
                        </div>
                    )
                ) : (
                    <button
                        onClick={() => setModalAcik(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all"
                    >
                        <FiUserPlus size={15} />
                        Portal Erişimi Ver
                    </button>
                )}
            </div>

            {modalAcik && (
                <PortalErigimiVerModal
                    firmaId={firmaId}
                    firmaUnvan={firmaUnvan}
                    firmaEmail={firmaEmail}
                    yetkiliKisi={yetkiliKisi}
                    locale={locale}
                    existingUsers={portalUsers}
                    onClose={() => setModalAcik(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
