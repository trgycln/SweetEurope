'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { gorevAtananKisiGuncelleAction } from './actions';

type ProfilOption = {
    id: string;
    tam_ad: string | null;
};

export default function GorevAtamaSelect({
    gorevId,
    currentAssigneeId,
    profiller,
    locale,
}: {
    gorevId: string;
    currentAssigneeId: string;
    profiller: ProfilOption[];
    locale?: string;
}) {
    const [selectedId, setSelectedId] = useState(currentAssigneeId);
    const [isPending, startTransition] = useTransition();

    const handleChange = (nextId: string) => {
        const previousId = selectedId;
        setSelectedId(nextId);

        startTransition(async () => {
            const result = await gorevAtananKisiGuncelleAction(gorevId, nextId, locale);

            if (result.error) {
                setSelectedId(previousId);
                toast.error(result.error);
                return;
            }

            toast.success(result.success || 'Personel ataması güncellendi.');
        });
    };

    return (
        <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            className="min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            title="Atanan personeli değiştir"
        >
            {profiller.map((profil) => (
                <option key={profil.id} value={profil.id}>
                    {profil.tam_ad || 'İsimsiz kullanıcı'}
                </option>
            ))}
        </select>
    );
}
