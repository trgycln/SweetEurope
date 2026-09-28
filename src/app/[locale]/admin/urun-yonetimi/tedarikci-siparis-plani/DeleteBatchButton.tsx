'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteBatch } from './actions';
import { useRouter } from 'next/navigation';

export default function DeleteBatchButton({ id, disabled }: { id: string, disabled?: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm('Bu taslak planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    
    setIsDeleting(true);
    try {
      const res = await deleteBatch(id);
      if (res.success) {
        router.refresh();
      } else {
        alert('Silinemedi: ' + res.message);
      }
    } catch (e: any) {
      alert('Beklenmeyen bir hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (disabled) return null;

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Taslağı Sil"
    >
      <Trash2 size={16} />
      {isDeleting ? 'Siliniyor...' : ''}
    </button>
  );
}
