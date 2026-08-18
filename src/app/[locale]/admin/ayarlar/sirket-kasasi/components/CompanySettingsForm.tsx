'use client';

import React, { useState, useMemo } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FiCopy, FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiInfo, FiSearch, FiStar } from 'react-icons/fi';

type SirketBilgisi = Tables<'sirket_resmi_bilgiler'>;

export default function CompanySettingsForm({ initialData }: { initialData: SirketBilgisi[] }) {
  const [data, setData] = useState<SirketBilgisi[]>(initialData);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    kategori: '',
    baslik: '',
    deger: ''
  });

  const supabase: any = createDynamicSupabaseClient(false);

  // Filter and Group data
  const groupedData = useMemo(() => {
    // 1. Filter based on search query
    const filteredData = data.filter(item => 
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.baslik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deger.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort data: Starred first, then alphabetical by title
    filteredData.sort((a, b) => {
      if (a.onemli_mi && !b.onemli_mi) return -1;
      if (!a.onemli_mi && b.onemli_mi) return 1;
      return a.baslik.localeCompare(b.baslik);
    });

    // 2. Group by kategori
    return filteredData.reduce((acc, item) => {
      if (!acc[item.kategori]) acc[item.kategori] = [];
      acc[item.kategori].push(item);
      return acc;
    }, {} as Record<string, SirketBilgisi[]>);
  }, [data, searchQuery]);

  // Unique categories for the datalist/dropdown
  const existingCategories = useMemo(() => Object.keys(groupedData), [groupedData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopyalandı: ' + text);
  };

  const handleSave = async () => {
    if (!formData.kategori || !formData.baslik || !formData.deger) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    if (editingId) {
      // Update
      const { data: updatedData, error } = await supabase
        .from('sirket_resmi_bilgiler')
        .update({
          kategori: formData.kategori,
          baslik: formData.baslik,
          deger: formData.deger,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)
        .select()
        .single();

      if (error) {
        toast.error('Güncelleme hatası: ' + error.message);
      } else if (updatedData) {
        setData(prev => prev.map(item => item.id === editingId ? updatedData : item));
        toast.success('Bilgi güncellendi.');
        setEditingId(null);
      }
    } else {
      // Insert
      const { data: newData, error } = await supabase
        .from('sirket_resmi_bilgiler')
        .insert({
          kategori: formData.kategori,
          baslik: formData.baslik,
          deger: formData.deger
        })
        .select()
        .single();

      if (error) {
        toast.error('Ekleme hatası: ' + error.message);
      } else if (newData) {
        setData(prev => [...prev, newData]);
        toast.success('Yeni bilgi eklendi.');
        setIsAdding(false);
      }
    }
    
    // Reset form
    if (!editingId) { // Only reset if not editing, or reset anyway? Let's reset always.
      setFormData({ kategori: '', baslik: '', deger: '' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu bilgiyi silmek istediğinize emin misiniz?')) return;
    
    const { error } = await supabase
      .from('sirket_resmi_bilgiler')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Silme hatası: ' + error.message);
    } else {
      setData(prev => prev.filter(item => item.id !== id));
      toast.success('Bilgi silindi.');
    }
  };

  const toggleImportance = async (item: SirketBilgisi) => {
    const newValue = !item.onemli_mi;
    
    // Optimistic update
    setData(prev => prev.map(i => i.id === item.id ? { ...i, onemli_mi: newValue } : i));

    const { error } = await supabase
      .from('sirket_resmi_bilgiler')
      .update({ onemli_mi: newValue })
      .eq('id', item.id);

    if (error) {
      toast.error('Güncelleme hatası: ' + error.message);
      // Revert on error
      setData(prev => prev.map(i => i.id === item.id ? { ...i, onemli_mi: !newValue } : i));
    }
  };

  const startEdit = (item: SirketBilgisi) => {
    setEditingId(item.id);
    setFormData({ kategori: item.kategori, baslik: item.baslik, deger: item.deger });
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ kategori: '', baslik: '', deger: '' });
  };

  return (
    <div className="space-y-8">
      {/* Üst Kısım: Ekleme Formu veya Butonu */}
      {isAdding ? (
        <div className="bg-white rounded-2xl shadow-lg border border-primary/20 p-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            {editingId ? <FiEdit2 className="text-primary" /> : <FiPlus className="text-primary" />}
            {editingId ? 'Bilgiyi Düzenle' : 'Yeni Şirket Bilgisi Ekle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <input 
                type="text" 
                value={formData.kategori}
                onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                placeholder="Örn: Vergi Bilgileri"
                list="category-list"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
              <datalist id="category-list">
                {existingCategories.map(cat => <option key={cat} value={cat} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
              <input 
                type="text" 
                value={formData.baslik}
                onChange={(e) => setFormData({...formData, baslik: e.target.value})}
                placeholder="Örn: Vergi Numarası (Steuernummer)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Değer</label>
              <input 
                type="text" 
                value={formData.deger}
                onChange={(e) => setFormData({...formData, deger: e.target.value})}
                placeholder="Girilecek değer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={cancelEdit}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <FiX /> İptal
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <FiSave /> Kaydet
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium shadow-sm"
          >
            <FiPlus size={18} />
            Yeni Bilgi Ekle
          </button>
        </div>
      )}

      {/* Arama Alanı */}
      {(data.length > 0 || searchQuery !== '') && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all shadow-sm"
            placeholder="Şirket bilgilerinde ara (kategori, başlık, değer...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Kategori Kartları */}
      {existingCategories.length === 0 && !isAdding && (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
          <FiInfo className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500 font-medium">
            {searchQuery ? 'Aramanızla eşleşen sonuç bulunamadı.' : 'Henüz kayıtlı bir şirket bilgisi bulunmuyor.'}
          </p>
        </div>
      )}

      {existingCategories.map((category) => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">{category}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {groupedData[category].map((item) => (
              <div key={item.id} className={`group relative px-6 py-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${item.onemli_mi ? 'bg-amber-50/60 hover:bg-amber-100/50' : 'hover:bg-gray-50/50'}`}>
                
                {/* Sol Taraf (Başlık) */}
                <div className="sm:w-1/3 min-w-0 flex items-center gap-2">
                  <button 
                    onClick={() => toggleImportance(item)}
                    className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${item.onemli_mi ? 'text-amber-500 hover:bg-amber-200/50' : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100'}`}
                    title={item.onemli_mi ? "Önemli İşaretini Kaldır" : "Önemli Olarak İşaretle"}
                  >
                    <FiStar size={18} fill={item.onemli_mi ? "currentColor" : "none"} />
                  </button>
                  <div className={`text-sm font-medium truncate ${item.onemli_mi ? 'text-amber-800' : 'text-gray-500'}`} title={item.baslik}>
                    {item.baslik}
                  </div>
                </div>

                {/* Orta Taraf (Değer ve Kopyala Butonu) */}
                <div className={`sm:w-1/2 flex items-center justify-between bg-white border rounded-lg px-3 py-2 shadow-sm ${item.onemli_mi ? 'border-amber-200' : 'border-gray-200'}`}>
                  <span className="text-gray-900 font-semibold truncate mr-2 font-mono text-sm" title={item.deger}>
                    {item.deger}
                  </span>
                  <button 
                    onClick={() => handleCopy(item.deger)}
                    className="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0"
                    title="Kopyala"
                  >
                    <FiCopy size={16} />
                  </button>
                </div>

                {/* Sağ Taraf (Etkileşim Butonları) */}
                <div className="sm:w-auto flex items-center gap-2 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Düzenle">
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Sil">
                    <FiTrash2 size={16} />
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
