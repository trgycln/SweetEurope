// src/components/Bildirimler.tsx (NİHAİ HİBRİT MODEL)
'use client';

import { useState, useEffect } from 'react';
import { usePortal } from '@/contexts/PortalContext';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/supabase/database.types';
import { FiBell } from 'react-icons/fi';
import Link from 'next/link';

type Bildirim = Tables<'bildirimler'>;

export function Bildirimler() {
    // DEĞİŞİKLİK: Başlangıç verilerini doğrudan Context'ten alıyoruz.
    const { initialNotifications, unreadNotificationCount } = usePortal();

    const [isOpen, setIsOpen] = useState(false);
    // DEĞİŞİKLİK: State'i sunucudan gelen ilk veriyle başlatıyoruz.
    const [bildirimler, setBildirimler] = useState<Bildirim[]>(initialNotifications);
    const [okunmamisSayisi, setOkunmamisSayisi] = useState<number>(unreadNotificationCount);

    useEffect(() => {
        const supabase = createDynamicSupabaseClient(true);

        // Realtime: Sadece YENİ gelen bildirimleri dinle
        const channel = supabase.channel('realtime-bildirimler')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'bildirimler' }, 
                async (payload) => {
                    const { data: { user } } = await supabase.auth.getUser();
                    const newBildirim = payload.new as Bildirim;
                    
                    // Yeni bildirim bu kullanıcıya aitse, listenin başına ekle ve sayacı artır.
                    if (user && newBildirim.alici_id === user.id) {
                        setBildirimler(prev => [newBildirim, ...prev]);
                        setOkunmamisSayisi(prev => prev + 1);
                        toast.info("Yeni bir bildiriminiz var!"); // Kullanıcıya bilgi verelim
                    }
                }
            )
            .subscribe();

        // Bileşen kaldırıldığında Realtime kanalını temizle
        return () => {
            supabase.removeChannel(channel);
        };
    }, []); // Bağımlılık dizisi boş kalacak, sadece bir kez abone olacağız.

    const handleOkunduIsaretle = async (id: string) => {
        const supabase = createDynamicSupabaseClient(true);
        // Sadece local state'te 'okundu' olarak işaretlenmemiş olanları güncelle
        const bildirimToUpdate = bildirimler.find(b => b.id === id && !b.okundu_mu);
        if (!bildirimToUpdate) return; // Zaten okunmuşsa bir şey yapma

        // Optimistic UI: Önce arayüzü güncelle, sonra veritabanını
        setBildirimler(bildirimler.map(b => b.id === id ? { ...b, okundu_mu: true } : b));
        setOkunmamisSayisi(prev => Math.max(0, prev - 1));

        const { error } = await supabase.from('bildirimler').update({ okundu_mu: true }).eq('id', id);
        if (error) {
            console.error('Bildirim güncellenirken hata:', error);
            // Hata olursa arayüzü geri al
            setBildirimler(bildirimler.map(b => b.id === id ? { ...b, okundu_mu: false } : b));
            setOkunmamisSayisi(prev => prev + 1);
            toast.error("Bildirim güncellenirken bir hata oluştu.");
        }
    };
    
    const handleTumunuOkunduIsaretle = async () => {
        const supabase = createDynamicSupabaseClient(true);
        const okunmamisIdler = bildirimler.filter(b => !b.okundu_mu).map(b => b.id);
        if(okunmamisIdler.length === 0) return;

        // Optimistic UI
        setBildirimler(bildirimler.map(b => ({ ...b, okundu_mu: true })));
        setOkunmamisSayisi(0);

        const { error } = await supabase.from('bildirimler').update({ okundu_mu: true }).in('id', okunmamisIdler);
        if(error) {
             console.error('Tüm bildirimler güncellenirken hata:', error);
             // Hata durumunda state'i geri yüklemek daha karmaşık olduğu için şimdilik logluyoruz.
             toast.error("Bildirimler güncellenirken bir hata oluştu.");
        }
    };


    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="relative text-text-main/70 hover:text-primary"
            >
                <FiBell size={22} />
                {okunmamisSayisi > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {okunmamisSayisi}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                    <div className="p-4 flex justify-between items-center border-b">
                        <span className="font-bold">Bildirimler</span>
                        {okunmamisSayisi > 0 && 
                            <button onClick={handleTumunuOkunduIsaretle} className="text-xs text-blue-500 hover:underline">Tümünü Okundu İşaretle</button>
                        }
                    </div>
                    <ul className="divide-y max-h-96 overflow-y-auto">
                        {bildirimler.length > 0 ? (
                            bildirimler.map(b => (
                                <li key={b.id}>
                                    <Link 
                                        href={b.link || '#'} 
                                        onClick={() => {
                                            setIsOpen(false);
                                            handleOkunduIsaretle(b.id);
                                        }}
                                        className={`block p-4 hover:bg-gray-50 ${!b.okundu_mu ? 'bg-blue-50' : ''}`}
                                    >
                                        <p className="text-sm text-gray-800">{b.icerik}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(b.created_at).toLocaleString('de-DE')}</p>
                                    </Link>
                                </li>
                            ))
                        ) : (
                            <li className='p-8 text-center text-sm text-gray-500'>Yeni bildirim yok.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}