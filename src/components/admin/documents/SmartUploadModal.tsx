'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SmartUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  klasorler?: { id: string; label: string; icon: string }[];
  defaultKategori?: string;
}

export default function SmartUploadModal({ isOpen, onClose, onSuccess, klasorler = [], defaultKategori = 'gelen_evrak_dosyasi' }: SmartUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'review' | 'uploading'>('idle');
  
  // AI Form Data
  const [aiData, setAiData] = useState({
    onerilen_dosya_adi: '',
    ozet: '',
    evrak_turu: '',
    kategori: defaultKategori,
    etiketler: [] as string[],
    kritik_bilgiler: '',
    tarih: ''
  });
  
  const [newTag, setNewTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update default kategori if it changes while modal is open
  React.useEffect(() => {
    setAiData(prev => ({ ...prev, kategori: defaultKategori }));
  }, [defaultKategori]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Sadece PDF dosyaları yüklenebilir.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setStatus('analyzing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/documents/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analiz hatası');
      }

      setAiData({
        onerilen_dosya_adi: data.onerilen_dosya_adi || file.name.replace('.pdf', ''),
        ozet: data.ozet || '',
        evrak_turu: data.evrak_turu || 'Diğer',
        kategori: defaultKategori,
        etiketler: data.etiketler || [],
        kritik_bilgiler: data.kritik_bilgiler || '',
        tarih: data.tarih || ''
      });
      setStatus('review');
    } catch (error: any) {
      toast.error(error.message);
      setStatus('idle');
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('aiData', JSON.stringify(aiData));

    try {
      const response = await fetch('/api/admin/documents/confirm', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt hatası');
      }

      toast.success('Evrak başarıyla akıllı sisteme kaydedildi!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
      setStatus('review');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setAiData({ ...aiData, etiketler: aiData.etiketler.filter(t => t !== tagToRemove) });
  };

  const addTag = () => {
    if (newTag.trim() && !aiData.etiketler.includes(newTag.trim())) {
      setAiData({ ...aiData, etiketler: [...aiData.etiketler, newTag.trim()] });
      setNewTag('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <UploadCloud className="text-blue-500 w-6 h-6" />
            Akıllı Evrak Yükleme (AI)
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STATE 1: IDLE */}
          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                {file ? file.name : "Yüklenecek PDF evrakını seçin"}
              </p>
              <p className="text-sm text-gray-500">veya sürükleyip bırakın</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf" 
                className="hidden" 
              />
              
              {file && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} 
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Yapay Zeka ile Analiz Et
                </button>
              )}
            </div>
          )}

          {/* STATE 2: ANALYZING */}
          {status === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin relative z-10" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">Yapay Zeka Dokümanı İnceliyor...</h3>
              <p className="text-gray-500 max-w-sm">Veriler okunuyor, özet çıkarılıyor ve otomatik isimlendirme oluşturuluyor.</p>
            </div>
          )}

          {/* STATE 3: REVIEW */}
          {(status === 'review' || status === 'uploading') && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Analiz Tamamlandı</h4>
                  <p className="text-sm opacity-90 mt-1">Lütfen yapay zekanın çıkardığı verileri kontrol edip onaylayın. Drive yüklemesi ardından yapılacaktır.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Önerilen Dosya Adı
                    <span className="text-xs text-blue-600 ml-2 font-normal">(Dosya No otomatik eklenecektir)</span>
                  </label>
                  <input 
                    type="text" 
                    value={aiData.onerilen_dosya_adi} 
                    onChange={e => setAiData({...aiData, onerilen_dosya_adi: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Klasör / Kategori</label>
                  <select
                    value={aiData.kategori}
                    onChange={e => setAiData({...aiData, kategori: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {klasorler.length > 0 ? (
                      klasorler.map(k => (
                        <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                      ))
                    ) : (
                      <option value="gelen_evrak_dosyasi">Gelen Evrak Dosyası</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Evrak Türü (Örn: Fatura)</label>
                  <input 
                    type="text" 
                    value={aiData.evrak_turu} 
                    onChange={e => setAiData({...aiData, evrak_turu: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tarih</label>
                  <input 
                    type="date" 
                    value={aiData.tarih} 
                    onChange={e => setAiData({...aiData, tarih: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Kritik Bilgiler (IBAN, TC, Şifre vb.)</label>
                  <textarea 
                    value={aiData.kritik_bilgiler} 
                    onChange={e => setAiData({...aiData, kritik_bilgiler: e.target.value})}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Evrak Özeti</label>
                <textarea 
                  value={aiData.ozet} 
                  onChange={e => setAiData({...aiData, ozet: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Etiketler</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {aiData.etiketler.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTag} 
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    placeholder="Yeni etiket ekle..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button onClick={addTag} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Ekle
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={onClose} 
            disabled={status === 'uploading'}
            className="px-5 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          
          {(status === 'review' || status === 'uploading') && (
            <button 
              onClick={handleConfirm} 
              disabled={status === 'uploading'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-75"
            >
              {status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {status === 'uploading' ? 'Kaydediliyor...' : "Onayla ve Drive'a Kaydet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
