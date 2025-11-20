'use client';

import { useState } from 'react';
import { FiStar, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { type Degerlendirme, voteDegerlendirme } from '@/app/actions/degerlendirme-actions';

interface DegerlendirmeListesiProps {
  degerlendirmeler: Degerlendirme[];
  showVoting?: boolean;
  mode?: 'public' | 'portal';
  dictionary?: any;
  locale?: string;
}

export default function DegerlendirmeListesi({
  degerlendirmeler,
  showVoting = true,
  mode = 'public',
  dictionary,
  locale = 'de'
}: DegerlendirmeListesiProps) {
  const [votingStates, setVotingStates] = useState<Record<string, 'helpful' | 'not-helpful' | null>>({});

  const handleVote = async (degerlendirmeId: string, yardimciMi: boolean) => {
    const currentVote = votingStates[degerlendirmeId];
    const newVote = currentVote === (yardimciMi ? 'helpful' : 'not-helpful') ? null : (yardimciMi ? 'helpful' : 'not-helpful');
    
    // Optimistic update
    setVotingStates(prev => ({
      ...prev,
      [degerlendirmeId]: newVote
    }));

    const result = await voteDegerlendirme(degerlendirmeId, yardimciMi);
    
    if (!result.success) {
      // Rollback on error
      setVotingStates(prev => ({
        ...prev,
        [degerlendirmeId]: currentVote
      }));
    }
  };

  const t = dictionary?.productReviews || {
    noReviews: 'Henüz değerlendirme yok',
    beFirst: 'Bu ürün için ilk değerlendirmeyi siz yapın!',
    verifiedBuyer: '✓ Doğrulanmış Alıcı',
    wasHelpful: 'Bu değerlendirme yardımcı oldu mu?',
    awaitingApproval: '⏳ Değerlendirmeniz yönetici onayı bekliyor',
    rejected: '❌ Değerlendirmeniz reddedildi',
    reason: 'Sebep'
  };

  if (degerlendirmeler.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <FiStar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{t.noReviews}</p>
        <p className="text-sm text-gray-400 mt-2">{t.beFirst}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {degerlendirmeler.map((degerlendirme) => {
        const userVote = votingStates[degerlendirme.id];
        
        return (
          <div
            key={degerlendirme.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {/* Yıldızlar */}
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      className={`w-4 h-4 ${
                        star <= degerlendirme.puan
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {degerlendirme.puan}/5
                  </span>
                </div>

                {/* Kullanıcı Bilgisi */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {degerlendirme.kullanici_adi}
                  </span>
                  {degerlendirme.firma_adi && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{degerlendirme.firma_adi}</span>
                    </>
                  )}
                  {degerlendirme.dogrulanmis_alis && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t.verifiedBuyer}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Tarih */}
              <span className="text-xs text-gray-400">
                {new Date(degerlendirme.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : locale === 'ar' ? 'ar-SA' : 'tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Başlık */}
            {degerlendirme.baslik && (
              <h4 className="font-semibold text-gray-900 mb-2">
                {degerlendirme.baslik}
              </h4>
            )}

            {/* Yorum */}
            {degerlendirme.yorum && (
              <p className="text-gray-700 leading-relaxed mb-4">
                {degerlendirme.yorum}
              </p>
            )}

            {/* Resimler */}
            {degerlendirme.resimler && degerlendirme.resimler.length > 0 && (
              <div className="flex gap-2 mb-4">
                {degerlendirme.resimler.map((resim, index) => (
                  <img
                    key={index}
                    src={resim}
                    alt={`Review image ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            )}

            {/* Yardımcı Oldu Mu? */}
            {showVoting && mode === 'portal' && (
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">{t.wasHelpful}</span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(degerlendirme.id, true)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      userVote === 'helpful'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    <FiThumbsUp className="w-4 h-4" />
                    <span className="font-medium">
                      {degerlendirme.yardimci_oy_sayisi}
                    </span>
                  </button>

                  <button
                    onClick={() => handleVote(degerlendirme.id, false)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      userVote === 'not-helpful'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    <FiThumbsDown className="w-4 h-4" />
                    <span className="font-medium">
                      {degerlendirme.yardimci_olmayan_oy_sayisi}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Onay Durumu (Sadece kullanıcının kendi değerlendirmesinde görünsün) */}
            {degerlendirme.onay_durumu === 'beklemede' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {t.awaitingApproval}
              </div>
            )}
            {degerlendirme.onay_durumu === 'reddedildi' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {t.rejected}
                {degerlendirme.red_nedeni && (
                  <p className="mt-1 text-xs">{t.reason}: {degerlendirme.red_nedeni}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
