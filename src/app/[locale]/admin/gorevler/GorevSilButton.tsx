'use client';

import { useTransition } from 'react';
import { gorevSilAction } from './actions';
import { toast } from 'sonner';
import { FiLoader, FiTrash2 } from 'react-icons/fi';

export default function GorevSilButton({
    gorevId,
    locale,
}: {
    gorevId: string;
    locale?: string;
}) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
            return;
        }

        startTransition(async () => {
            const result = await gorevSilAction(gorevId, locale);
            if (result.success) toast.success(result.success);
            else if (result.error) toast.error(result.error);
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="p-2 rounded-full hover:bg-red-100 text-red-600 disabled:opacity-50"
            title="Görevi sil"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
        </button>
    );
}
