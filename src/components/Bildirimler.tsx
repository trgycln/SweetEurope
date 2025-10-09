// src/components/Bildirimler.tsx
'use client';

import { FiBell, FiCheck } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';

type Bildirim = Tables<'bildirimler'>;

export function Bildirimler() {
    const supabase = createSupabaseBrowserClient();
    const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
    const [okunmamisSayisi, setOkunmamisSayisi] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchBildirimler = async () => {
            const { data, error } = await supabase
                .from('bildirimler')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (data) {
                setBildirimler(data);
                setOkunmamisSayisi(data.filter(b => !b.okundu_mu).length);
            }
        };

        fetchBildirimler();
        
        // Realtime: Yeni bildirim geldiğinde listeyi güncelle
        const channel = supabase.channel('realtime-bildirimler')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bildirimler' }, (payload) => {
                fetchBildirimler(); // Yeni bildirim geldiğinde tüm listeyi yeniden çek
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [supabase]);

    const handleOkunduIsaretle = async (id: string) => {
        await supabase.from('bildirimler').update({ okundu_mu: true }).eq('id', id);
        setBildirimler(bildirimler.map(b => b.id === id ? { ...b, okundu_mu: true } : b));
        setOkunmamisSayisi(prev => prev - 1);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative text-text-main/70 hover:text-primary">
                <FiBell size={22} />
                {okunmamisSayisi > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {okunmamisSayisi}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200">
                    <div className="p-4 font-bold border-b">Bildirimler</div>
                    <ul className="divide-y max-h-96 overflow-y-auto">
                        {bildirimler.map(b => (
                            <li key={b.id} className={`p-4 ${!b.okundu_mu ? 'bg-blue-50' : ''}`}>
                                <Link href={b.link || '#'} onClick={() => setIsOpen(false)}>
                                    <p className="text-sm text-gray-700">{b.icerik}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(b.created_at).toLocaleString('tr-TR')}</p>
                                </Link>
                                {!b.okundu_mu && (
                                    <button onClick={() => handleOkunduIsaretle(b.id)} className="text-xs text-blue-600 hover:underline mt-2">Okundu olarak işaretle</button>
                                )}
                            </li>
                        ))}
                         {bildirimler.length === 0 && <li className='p-4 text-center text-sm text-gray-500'>Yeni bildirim yok.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}