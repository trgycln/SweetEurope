'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus } from 'react-icons/fi';
import { PortalErigimiVerModal } from './PortalErigimiVerModal';

interface Props {
    firmaId: string;
    firmaUnvan: string;
    firmaEmail: string | null;
    yetkiliKisi: string | null;
    locale: string;
}

export function PortalErigimiVerButton({
    firmaId, firmaUnvan, firmaEmail, yetkiliKisi, locale,
}: Props) {
    const [modalAcik, setModalAcik] = useState(false);
    const router = useRouter();

    return (
        <>
            <button
                onClick={() => setModalAcik(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
                <FiUserPlus size={14} />
                Portal Erişimi Ver
            </button>

            {modalAcik && (
                <PortalErigimiVerModal
                    firmaId={firmaId}
                    firmaUnvan={firmaUnvan}
                    firmaEmail={firmaEmail}
                    yetkiliKisi={yetkiliKisi}
                    locale={locale}
                    onClose={() => setModalAcik(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
