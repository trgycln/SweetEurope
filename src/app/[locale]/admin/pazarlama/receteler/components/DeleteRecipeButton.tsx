'use client';

import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DeleteRecipeButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const handleDelete = async () => {
        if (!confirm('Bu reçeteyi silmek istediğinize emin misiniz?')) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase.from('recipes').delete().eq('id', id);
            
            if (error) throw error;
            
            toast.success('Reçete başarıyla silindi');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error('Reçete silinirken bir hata oluştu');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 disabled:opacity-50"
            title="Sil"
        >
            <FiTrash2 /> {isDeleting ? 'Siliniyor...' : 'Sil'}
        </button>
    );
}
