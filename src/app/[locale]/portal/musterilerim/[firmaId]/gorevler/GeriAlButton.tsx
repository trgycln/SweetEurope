'use client';

import { useTransition } from 'react';
import { gorevDurumGuncelleAction } from './actions';
import { toast } from 'sonner';
import { FiRotateCcw, FiLoader } from 'react-icons/fi';

export default function GeriAlButton({ gorevId, firmaId }: { gorevId: string, firmaId: string }) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const result = await gorevDurumGuncelleAction(gorevId, firmaId, false); 
            if (result.success) {
                toast.success(result.success);
            } else if (result.error) {
                toast.error(result.error);
            }
        });
    };

    return (
        <button 
            onClick={handleClick} 
            disabled={isPending}
            className="flex-shrink-0 p-2 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
            title="Görevi yeniden aç"
        >
            {isPending ? <FiLoader className="animate-spin" /> : <FiRotateCcw />}
        </button>
    );
}
