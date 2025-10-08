// src/app/admin/idari/gorevler/page.tsx (MOBİL UYUMLULUK DÜZELTİLDİ)

'use client'; 

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiPlus, FiUser, FiCalendar, FiAlertOctagon } from 'react-icons/fi';
import { gorevDurumGuncelleAction } from '@/app/actions/gorev-actions';

// Tipler
type Gorev = Tables<'gorevler'> & { profiller: Pick<Tables<'profiller'>, 'tam_ad'> | null };
type GorevDurumu = Enums<'gorev_durumu'>;

const sutunlar: GorevDurumu[] = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];

// TEK BİR GÖREV KARTINI TEMSİL EDEN BİLEŞEN
const GorevKarti = ({ gorev }: { gorev: Gorev }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: gorev.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const isGecikmis = gorev.son_tarih && new Date(gorev.son_tarih) < new Date();

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
             className={`bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 ${isGecikmis ? 'border-red-500' : 'border-transparent'}`}>
            <p className="font-bold text-primary">{gorev.baslik}</p>
            <div className="flex justify-between items-center mt-3 text-sm text-text-main/70">
                <div className="flex items-center gap-1">
                    <FiCalendar size={14}/>
                    <span>{gorev.son_tarih ? new Date(gorev.son_tarih).toLocaleDateString('tr-TR') : 'Tarihsiz'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <FiUser size={14}/>
                    <span>{gorev.profiller?.tam_ad?.split(' ')[0] || 'Atanmamış'}</span>
                </div>
            </div>
            {isGecikmis && <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><FiAlertOctagon size={12}/> Süresi Geçti</p>}
        </div>
    );
};

// KANBAN SÜTUNUNU TEMSİL EDEN BİLEŞEN
const KanbanSutunu = ({ durum, gorevler }: { durum: GorevDurumu, gorevler: Gorev[] }) => {
    const { setNodeRef } = useSortable({ id: durum });
    return (
        // DÜZELTME: Sütunlar artık mobilde tam genişlik, masaüstünde sabit genişlik kullanacak.
        <div ref={setNodeRef} className="bg-bg-subtle/50 w-full lg:w-80 lg:flex-shrink-0 p-4 rounded-xl">
            <h2 className="font-bold text-lg text-primary mb-4 px-2">{durum} ({gorevler.length})</h2>
            <SortableContext items={gorevler.map(g => g.id)}>
                <div className="space-y-4">
                    {gorevler.map(gorev => <GorevKarti key={gorev.id} gorev={gorev} />)}
                </div>
            </SortableContext>
        </div>
    );
};

// ANA GÖREV YÖNETİM SAYFASI
export default function GorevYonetimSayfasi() {
    const [gorevler, setGorevler] = useState<Gorev[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        const fetchGorevler = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('gorevler')
                .select('*, profiller(tam_ad)')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Görevler çekilemedi:", error);
            } else {
                setGorevler(data as Gorev[]);
            }
            setIsLoading(false);
        };
        fetchGorevler();
    }, [supabase]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const aktifGorev = gorevler.find(g => g.id === activeId);
        if (!aktifGorev) return;

        if (sutunlar.includes(overId as GorevDurumu)) {
            const yeniDurum = overId as GorevDurumu;
            if (aktifGorev.durum !== yeniDurum) {
                setGorevler(prev => prev.map(g => g.id === activeId ? { ...g, durum: yeniDurum } : g));
                gorevDurumGuncelleAction(aktifGorev.id, yeniDurum);
            }
        }
    };

    if (isLoading) {
        return <div className="p-8 font-serif text-center">Görev Panosu Yükleniyor...</div>;
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Görev Panosu</h1>
                    <p className="text-text-main/80 mt-1">İş akışınızı buradan yönetin.</p>
                </div>
                <Link href="/admin/gorevler/ekle" className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto">
                    <FiPlus size={18} /> Yeni Görev Oluştur
                </Link>
            </header>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {/* DÜZELTME: Bu div artık mobilde dikey (flex-col), masaüstünde yatay (lg:flex-row) olacak. */}
                <div className="flex flex-col lg:flex-row gap-6 lg:overflow-x-auto lg:pb-6">
                    {sutunlar.map(durum => (
                        <KanbanSutunu 
                            key={durum} 
                            durum={durum} 
                            gorevler={gorevler.filter(g => g.durum === durum)} 
                        />
                    ))}
                </div>
            </DndContext>
        </div>
    );
}