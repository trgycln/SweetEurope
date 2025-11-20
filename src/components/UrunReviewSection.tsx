'use client';

import { useState, useEffect } from 'react';
import { FiStar, FiEdit, FiMessageSquare } from 'react-icons/fi';
import DegerlendirmeForm from './DegerlendirmeForm';
import DegerlendirmeListesi from './DegerlendirmeListesi';
import {
  getUrunDegerlendirmeleri,
  getKullaniciDegerlendirmesi,
  checkUrunSatinAlindi,
  type Degerlendirme,
} from '@/app/actions/degerlendirme-actions';

interface UrunReviewSectionProps {
  urunId: string;
  ortalamaPuan: number | null;
  degerlendirmeSayisi: number | null;
  mode?: 'public' | 'portal';
  dictionary?: any;
  locale?: string;
}

export function UrunReviewSection({
  urunId,
  ortalamaPuan,
  degerlendirmeSayisi,
  mode = 'public',
  dictionary,
  locale = 'de',
}: UrunReviewSectionProps) {
  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([]);
  const [kullaniciDegerlendirmesi, setKullaniciDegerlendirmesi] = useState<Degerlendirme | null>(null);
  const [urunSatinAlindi, setUrunSatinAlindi] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const portalMode = mode === 'portal';

  useEffect(() => {
    loadData();
  }, [urunId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviews, userReview, purchased] = await Promise.all([
        getUrunDegerlendirmeleri(urunId),
        // Kullanıcı ve satın alma bilgileri sadece portal modunda anlamlı
        portalMode ? getKullaniciDegerlendirmesi(urunId) : Promise.resolve(null),
        portalMode ? checkUrunSatinAlindi(urunId) : Promise.resolve(false),
      ]);

      setDegerlendirmeler(reviews);
      setKullaniciDegerlendirmesi(userReview);
      setUrunSatinAlindi(purchased);
    } catch (error) {
      console.error('Reviews yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadData(); // Reload reviews
  };

  const averageRating = ortalamaPuan || 0;
  const reviewCount = degerlendirmeSayisi || 0;

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif text-primary mb-2">
              Kundenbewertungen
            </h2>
            
            {/* Average Rating Display */}
            {averageRating > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {averageRating.toFixed(1)}
                  </span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.floor(averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : star - 0.5 <= averageRating
                              ? 'fill-yellow-400 text-yellow-400 opacity-50'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {reviewCount} {reviewCount === 1 ? 'Bewertung' : 'Bewertungen'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reviewCount === 0 && (
              <p className="text-gray-500">
                Seien Sie der Erste, der dieses Produkt bewertet!
              </p>
            )}
          </div>

          {/* Write Review Button */}
          {portalMode && urunSatinAlindi && !kullaniciDegerlendirmesi && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <FiMessageSquare className="w-5 h-5" />
              Bewertung schreiben
            </button>
          )}

          {/* Edit Review Button */}
          {portalMode && kullaniciDegerlendirmesi && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl"
            >
              <FiEdit className="w-5 h-5" />
              Bewertung bearbeiten
            </button>
          )}
        </div>

        {/* Purchase Required Message */}
        {portalMode && !urunSatinAlindi && !kullaniciDegerlendirmesi && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <p className="font-medium mb-1">ℹ️ Hinweis</p>
            <p>
              Sie müssen dieses Produkt gekauft haben, um eine Bewertung abgeben zu können.
            </p>
          </div>
        )}

        {/* Review Form */}
        {portalMode && showForm && (
          <div className="mb-8">
            <DegerlendirmeForm
              urunId={urunId}
              existingDegerlendirme={kullaniciDegerlendirmesi}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* User's Own Review (if pending/rejected) */}
        {portalMode && kullaniciDegerlendirmesi && 
         kullaniciDegerlendirmesi.onay_durumu !== 'onaylandi' && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Ihre Bewertung
            </h3>
            <DegerlendirmeListesi
              degerlendirmeler={[kullaniciDegerlendirmesi]}
              showVoting={false}
              mode={mode}
              dictionary={dictionary}
              locale={locale}
            />
          </div>
        )}

        {/* Reviews List */}
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-500">Bewertungen werden geladen...</p>
            </div>
          ) : (
            <DegerlendirmeListesi
              degerlendirmeler={degerlendirmeler}
              showVoting={portalMode}
              mode={mode}
              dictionary={dictionary}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
