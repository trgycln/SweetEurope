'use client';

import { useMemo, useState } from 'react';
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

  const selectedProfil = useMemo(
    () => profiller.find((profil) => profil.id === selectedProfilId) || null,
    [profiller, selectedProfilId]
  );

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
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select 
          value={selectedProfilId}
          onChange={(e) => setSelectedProfilId(e.target.value)}
          className="min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Standart fiyat / profil yok</option>
          {profiller.map((profil) => (
            <option key={profil.id} value={profil.id}>
              {profil.ad} ({profil.genel_indirim_yuzdesi > 0 ? '+' : ''}{profil.genel_indirim_yuzdesi}%)
            </option>
          ))}
        </select>
        
        {hasChanged ? (
          <button 
            type="submit"
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              isLoading 
                ? 'cursor-not-allowed bg-gray-400' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Kaydediliyor...' : 'Profili Kaydet'}
          </button>
        ) : (
          <span className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            ✓ Mevcut seçim kayıtlı
          </span>
        )}
      </form>

      <p className="text-xs text-gray-500">
        {selectedProfil
          ? `Seçili profil: ${selectedProfil.ad} (${selectedProfil.genel_indirim_yuzdesi > 0 ? '+' : ''}${selectedProfil.genel_indirim_yuzdesi}% genel etki)`
          : 'Bu firma için standart fiyatlandırma geçerli olur.'}
      </p>
    </div>
  );
}