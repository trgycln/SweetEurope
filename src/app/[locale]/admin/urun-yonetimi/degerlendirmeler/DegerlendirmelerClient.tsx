'use client';

import { useState } from 'react';
import { FiStar, FiCheck, FiX, FiUser, FiPackage, FiCalendar } from 'react-icons/fi';
import { approveDegerlendirme, rejectDegerlendirme } from '@/app/actions/degerlendirme-actions';
import { Locale } from '@/lib/utils';

interface Review {
  id: string;
  urun_id: string;
  kullanici_id: string;
  puan: number;
  baslik: string | null;
  yorum: string | null;
  resimler: string[] | null;
  dogrulanmis_alis: boolean;
  created_at: string;
  kullanici_adi: string;
  kullanici_email: string;
  firma_adi: string | null;
  urun_adi: string;
}

interface DegerlendirmelerClientProps {
  reviews: Review[];
  locale: Locale;
}

export function DegerlendirmelerClient({ reviews: initialReviews, locale }: DegerlendirmelerClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const handleApprove = async (reviewId: string) => {
    setProcessing(reviewId);
    const result = await approveDegerlendirme(reviewId);
    
    if (result.success) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } else {
      alert('Fehler beim Genehmigen: ' + (result.error || 'Unbekannter Fehler'));
    }
    setProcessing(null);
  };

  const handleReject = async (reviewId: string) => {
    const reason = rejectReason[reviewId];
    if (!reason || reason.trim() === '') {
      alert('Bitte geben Sie einen Ablehnungsgrund an.');
      return;
    }

    setProcessing(reviewId);
    const result = await rejectDegerlendirme(reviewId, reason);
    
    if (result.success) {
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setShowRejectModal(null);
      setRejectReason(prev => {
        const newState = { ...prev };
        delete newState[reviewId];
        return newState;
      });
    } else {
      alert('Fehler beim Ablehnen: ' + (result.error || 'Unbekannter Fehler'));
    }
    setProcessing(null);
  };

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FiStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Keine ausstehenden Bewertungen
        </h3>
        <p className="text-gray-500">
          Alle Kundenbewertungen wurden bearbeitet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {reviews.length} {reviews.length === 1 ? 'Bewertung' : 'Bewertungen'}
            </h2>
            <p className="text-gray-600 mt-1">Warten auf Genehmigung</p>
          </div>
          <div className="bg-white rounded-full p-4 shadow-sm">
            <FiStar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {/* Product Name */}
              <div className="flex items-center gap-2 mb-2">
                <FiPackage className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-gray-900">
                  {review.urun_adi}
                </h3>
              </div>

              {/* Customer Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FiUser className="w-4 h-4" />
                  <span className="font-medium">{review.kullanici_adi}</span>
                  {review.dogrulanmis_alis && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Verifizierter Kauf
                    </span>
                  )}
                </div>
                {review.firma_adi && (
                  <span className="text-gray-400">•</span>
                )}
                {review.firma_adi && (
                  <span>{review.firma_adi}</span>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <FiCalendar className="w-3 h-3" />
                {new Date(review.created_at).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 bg-yellow-50 px-4 py-2 rounded-lg">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.puan
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-lg font-bold text-gray-900">
                {review.puan}/5
              </span>
            </div>
          </div>

          {/* Review Content */}
          {review.baslik && (
            <h4 className="font-semibold text-gray-900 mb-2">
              {review.baslik}
            </h4>
          )}
          {review.yorum && (
            <p className="text-gray-700 leading-relaxed mb-4">
              {review.yorum}
            </p>
          )}

          {/* Images */}
          {review.resimler && review.resimler.length > 0 && (
            <div className="flex gap-2 mb-4">
              {review.resimler.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Review ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleApprove(review.id)}
              disabled={processing === review.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCheck className="w-5 h-5" />
              {processing === review.id ? 'Genehmigung...' : 'Genehmigen'}
            </button>

            <button
              onClick={() => setShowRejectModal(review.id)}
              disabled={processing === review.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiX className="w-5 h-5" />
              Ablehnen
            </button>
          </div>

          {/* Reject Modal */}
          {showRejectModal === review.id && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Bewertung ablehnen
                </h3>
                <p className="text-gray-600 mb-4">
                  Bitte geben Sie einen Grund für die Ablehnung an:
                </p>
                <textarea
                  value={rejectReason[review.id] || ''}
                  onChange={(e) => setRejectReason(prev => ({
                    ...prev,
                    [review.id]: e.target.value
                  }))}
                  placeholder="z.B. Unangemessener Inhalt, Spam, irreführende Informationen..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectReason(prev => {
                        const newState = { ...prev };
                        delete newState[review.id];
                        return newState;
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleReject(review.id)}
                    disabled={processing === review.id || !rejectReason[review.id]?.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === review.id ? 'Ablehnung...' : 'Ablehnen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
