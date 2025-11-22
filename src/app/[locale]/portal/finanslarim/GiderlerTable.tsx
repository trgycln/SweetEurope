'use client';

import { useState, useTransition } from 'react';
import { FiEdit, FiTrash2, FiX, FiCheck, FiTrendingDown } from 'react-icons/fi';
import { updateGiderAction, deleteGiderAction } from './actions';
import { toast } from 'sonner';

type Gider = {
  id: string;
  tarih: string;
  kategori: string | null;
  aciklama: string | null;
  tutar: number;
};

interface GiderlerTableProps {
  giderler: Gider[];
  locale: string;
  giderToplam: number;
}

export default function GiderlerTable({ 
  giderler, 
  locale, 
  giderToplam 
}: GiderlerTableProps) {
  // Client-side formatting functions
  const formatCurrency = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' }).format(v || 0);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Gider | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (gider: Gider) => {
    setEditingId(gider.id);
    setEditForm({ ...gider });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    const formData = new FormData();
    formData.append('gider_tarih', editForm.tarih);
    formData.append('gider_kategori', editForm.kategori || '');
    formData.append('gider_aciklama', editForm.aciklama || '');
    formData.append('gider_tutar', editForm.tutar.toString());

    startTransition(async () => {
      const result = await updateGiderAction(editForm.id, formData, locale);
      if (result.success) {
        toast.success('Gider güncellendi');
        setEditingId(null);
        setEditForm(null);
      } else {
        toast.error(result.error || 'Güncelleme başarısız');
      }
    });
  };

  const handleDelete = async (giderId: string) => {
    if (!window.confirm('Bu gideri silmek istediğinizden emin misiniz?')) return;

    startTransition(async () => {
      const result = await deleteGiderAction(giderId, locale);
      if (result.success) {
        toast.success('Gider silindi');
      } else {
        toast.error(result.error || 'Silme başarısız');
      }
    });
  };

  if (giderler.length === 0) {
    return (
      <div className="p-12 text-center">
        <FiTrendingDown className="mx-auto text-5xl text-gray-300 mb-4" />
        <p className="text-gray-500">Henüz gider kaydı bulunmuyor</p>
      </div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</th>
          <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {giderler.map((gider) => {
          const isEditing = editingId === gider.id;

          return (
            <tr key={gider.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm?.tarih || ''}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, tarih: e.target.value } : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  formatDate(gider.tarih)
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {isEditing ? (
                  <select
                    value={editForm?.kategori || ''}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, kategori: e.target.value } : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Personel">Personel</option>
                    <option value="Malzeme">Malzeme</option>
                    <option value="Pazarlama">Pazarlama</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                ) : (
                  gider.kategori || '-'
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm?.aciklama || ''}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, aciklama: e.target.value } : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                  />
                ) : (
                  gider.aciklama || '-'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editForm?.tutar || 0}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, tutar: parseFloat(e.target.value) || 0 } : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm text-right w-24"
                  />
                ) : (
                  formatCurrency(Number(gider.tutar || 0))
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                {isEditing ? (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                      title="Kaydet"
                    >
                      <FiCheck size={16} />
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isPending}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                      title="İptal"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(gider)}
                      disabled={isPending}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      title="Düzenle"
                    >
                      <FiEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(gider.id)}
                      disabled={isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Sil"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
            Toplam Gider:
          </td>
          <td className="px-6 py-4 text-right text-lg font-bold text-red-700">
            {formatCurrency(giderToplam)}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );
}
