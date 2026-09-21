'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiTrash2 } from 'react-icons/fi';

export default function DeleteBlogButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Bu blog yazısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/delete-blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (e) {
      alert('Silme işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 ml-4 disabled:opacity-50"
    >
      <FiTrash2 /> {loading ? 'Siliniyor...' : 'Sil'}
    </button>
  );
}
