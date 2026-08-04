'use client';

import { useState } from 'react';
import { IletisimMesaji, markMesajOkunduAction, deleteMesajAction } from '@/app/actions/mesajlar-actions';
import { toast } from 'sonner';
import { FiCheck, FiMail, FiTrash2, FiClock } from 'react-icons/fi';

export default function MesajlarClient({ initialMessages }: { initialMessages: IletisimMesaji[] }) {
  const [messages, setMessages] = useState<IletisimMesaji[]>(initialMessages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<IletisimMesaji | null>(null);

  const handleMarkAsRead = async (id: string) => {
    setLoadingId(id);
    const res = await markMesajOkunduAction(id);
    if (res.success) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === id ? { ...msg, okundu_mu: true, okunma_tarihi: new Date().toISOString() } : msg
        )
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, okundu_mu: true, okunma_tarihi: new Date().toISOString() });
      }
      toast.success('Mesaj okundu olarak işaretlendi.');
    } else {
      toast.error(res.error || 'İşlem başarısız.');
    }
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    
    setLoadingId(id);
    const res = await deleteMesajAction(id);
    if (res.success) {
      setMessages(prev => prev.filter(msg => msg.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      toast.success('Mesaj silindi.');
    } else {
      toast.error(res.error || 'İşlem başarısız.');
    }
    setLoadingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Mesaj Listesi */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Gelen Mesajlar</h2>
          <p className="text-sm text-slate-500">Toplam {messages.length} mesaj</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FiMail className="mx-auto h-8 w-8 mb-2 opacity-20" />
              <p>Gelen kutusu boş.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.okundu_mu) handleMarkAsRead(msg.id);
                  }}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${selectedMessage?.id === msg.id ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className={`mt-1 shrink-0 h-2 w-2 rounded-full ${msg.okundu_mu ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={`text-sm truncate pr-2 ${msg.okundu_mu ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
                        {msg.ad_soyad}
                      </p>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1.5">{msg.email}</p>
                    <p className={`text-sm line-clamp-2 ${msg.okundu_mu ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                      {msg.mesaj}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mesaj Detayı */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {selectedMessage ? (
          <>
            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedMessage.ad_soyad}</h3>
                <a href={`mailto:${selectedMessage.email}`} className="text-sm font-medium text-primary hover:underline">
                  {selectedMessage.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                  <FiClock className="h-3.5 w-3.5" />
                  {formatDate(selectedMessage.created_at)}
                </span>
                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  disabled={loadingId === selectedMessage.id}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Sil
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {selectedMessage.mesaj}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <FiMail className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-600">Mesaj Seçilmedi</p>
            <p className="text-sm mt-1 text-center">Okumak için sol taraftaki listeden bir mesaja tıklayın.</p>
          </div>
        )}
      </div>
    </div>
  );
}
