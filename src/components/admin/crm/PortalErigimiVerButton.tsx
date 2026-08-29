'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus, FiKey, FiCheckCircle } from 'react-icons/fi';
import { PortalErigimiVerModal } from './PortalErigimiVerModal';

interface Props {
    firmaId: string;
    firmaUnvan: string;
    firmaEmail: string | null;
    yetkiliKisi: string | null;
    locale: string;
    portalUsers?: Array<{ id: string; tam_ad: string | null; rol: string }>;
    firmaStatus?: string;
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

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                {hasPortalAccess ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Portal Aktif ({portalUsers.length} Yetkili)</span>
                        </div>
                        <button
                            onClick={() => setModalAcik(true)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                            <FiKey size={12} />
                            Şifre / Erişim Yönet
                        </button>
                    </div>
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
