'use client';

import { useState } from 'react';
import { FiRefreshCw, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AutoTranslateButton({ id, isMissing }: { id: string, isMissing: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!isMissing);
  const router = useRouter();

  if (done && !loading) {
    return <span className="text-emerald-600 inline-flex items-center gap-1 text-sm font-medium mr-4"><FiCheck /> 4 Dil Tamam</span>;
  }

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auto-translate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (!res.ok) throw new Error('Çeviri başarısız');
      
      toast.success('Çeviri başarıyla tamamlandı!');
      setDone(true);
      router.refresh();
    } catch (error) {
      toast.error('Çeviri sırasında bir hata oluştu.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTranslate}
      disabled={loading}
      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mr-4 disabled:opacity-50"
      title="Eksik dilleri yapay zeka ile otomatik çevir"
    >
      <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
      {loading ? 'Çevriliyor...' : 'Eksik Dilleri Çevir (AI)'}
    </button>
  );
}
