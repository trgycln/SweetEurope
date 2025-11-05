'use client';

import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { createDegerlendirme, updateDegerlendirme, type Degerlendirme } from '@/app/actions/degerlendirme-actions';

interface DegerlendirmeFormProps {
  urunId: string;
  existingDegerlendirme?: Degerlendirme | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DegerlendirmeForm({
  urunId,
  existingDegerlendirme,
  onSuccess,
  onCancel
}: DegerlendirmeFormProps) {
  const [puan, setPuan] = useState(existingDegerlendirme?.puan || 0);
  const [hoveredPuan, setHoveredPuan] = useState(0);
  const [baslik, setBaslik] = useState(existingDegerlendirme?.baslik || '');
  const [yorum, setYorum] = useState(existingDegerlendirme?.yorum || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (puan === 0) {
      setError('Lütfen bir puan seçin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (existingDegerlendirme) {
        result = await updateDegerlendirme(existingDegerlendirme.id, {
          puan,
          baslik: baslik || undefined,
          yorum: yorum || undefined,
        });
      } else {
        result = await createDegerlendirme({
          urunId,
          puan,
          baslik: baslik || undefined,
          yorum: yorum || undefined,
        });
      }

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Bir hata oluştu');
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      {/* Başlık */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {existingDegerlendirme ? 'Değerlendirmenizi Düzenleyin' : 'Ürünü Değerlendirin'}
        </h3>
      </div>

      {/* Puan Seçimi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Puanınız *
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setPuan(star)}
              onMouseEnter={() => setHoveredPuan(star)}
              onMouseLeave={() => setHoveredPuan(0)}
              className="transition-transform hover:scale-110"
            >
              <FiStar
                className={`w-8 h-8 ${
                  star <= (hoveredPuan || puan)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {puan > 0 && (
            <span className="ml-2 text-sm text-gray-600 flex items-center">
              ({puan}/5)
            </span>
          )}
        </div>
      </div>

      {/* Başlık */}
      <div>
        <label htmlFor="baslik" className="block text-sm font-medium text-gray-700 mb-2">
          Başlık (Opsiyonel)
        </label>
        <input
          type="text"
          id="baslik"
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Örn: Harika ürün, çok memnunum!"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={100}
        />
      </div>

      {/* Yorum */}
      <div>
        <label htmlFor="yorum" className="block text-sm font-medium text-gray-700 mb-2">
          Yorumunuz (Opsiyonel)
        </label>
        <textarea
          id="yorum"
          value={yorum}
          onChange={(e) => setYorum(e.target.value)}
          placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          maxLength={1000}
        />
        <p className="mt-1 text-xs text-gray-500">
          {yorum.length}/1000 karakter
        </p>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Not */}
      {!existingDegerlendirme && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-1">ℹ️ Bilgilendirme</p>
          <p>Değerlendirmeniz yönetici onayından sonra yayınlanacaktır.</p>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
        )}
        <button
          type="submit"
          disabled={loading || puan === 0}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : existingDegerlendirme ? 'Güncelle' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}
