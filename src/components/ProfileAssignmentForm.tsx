'use client';

import { useState } from 'react';
import { assignCustomerProfileAction } from '@/app/actions/customer-profile-actions';

interface ProfileAssignmentFormProps {
  firma: {
    id: string;
    firma_adi: string;
    musteri_profil_id: string | null;
  };
  profiller: Array<{
    id: string;
    ad: string;
    genel_indirim_yuzdesi: number;
  }>;
  locale: string;
}

export default function ProfileAssignmentForm({ 
  firma, 
  profiller, 
  locale 
}: ProfileAssignmentFormProps) {
  const [selectedProfilId, setSelectedProfilId] = useState(firma.musteri_profil_id || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const profilId = selectedProfilId || null;
      await assignCustomerProfileAction(firma.id, profilId, locale);
    } catch (error) {
      console.error('Profil atama hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanged = selectedProfilId !== (firma.musteri_profil_id || '');

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <select 
        value={selectedProfilId}
        onChange={(e) => setSelectedProfilId(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 min-w-[140px]"
        disabled={isLoading}
      >
        <option value="">Profil yok</option>
        {profiller.map((profil) => (
          <option key={profil.id} value={profil.id}>
            {profil.ad} ({profil.genel_indirim_yuzdesi > 0 ? '+' : ''}{profil.genel_indirim_yuzdesi}%)
          </option>
        ))}
      </select>
      
      {hasChanged && (
        <button 
          type="submit"
          disabled={isLoading}
          className={`px-3 py-1 text-xs rounded text-white font-medium ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? '...' : 'Kaydet'}
        </button>
      )}
      
      {!hasChanged && (
        <span className="text-xs text-gray-500 px-3 py-1">
          ✓ Güncel
        </span>
      )}
    </form>
  );
}