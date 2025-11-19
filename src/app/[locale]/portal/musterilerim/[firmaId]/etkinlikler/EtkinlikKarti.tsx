'use client';

import { useState, useTransition } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { FiEdit, FiSave, FiX, FiLoader, FiMessageSquare, FiPhone, FiUsers, FiClipboard, FiFileText } from 'react-icons/fi';
import { updateEtkinlikAction } from './actions';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

const etkinlikIkonlari: Record<string, React.ElementType> = {
    'Not': FiMessageSquare,
    'Telefon Görüşmesi': FiPhone,
    'Toplantı': FiUsers,
    'E-posta': FiFileText,
    'Teklif': FiClipboard,
};

type Etkinlik = Tables<'etkinlikler'> & { olusturan_personel: { tam_ad: string | null } | null };

interface EtkinlikKartiProps {
    etkinlik: Etkinlik;
    zamanFarki: string;
    ikonAdi: string;
    currentUser: User | null;
}

export default function EtkinlikKarti({ etkinlik, zamanFarki, ikonAdi, currentUser }: EtkinlikKartiProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [currentAciklama, setCurrentAciklama] = useState(etkinlik.aciklama);

    const Icon = etkinlikIkonlari[ikonAdi] || FiMessageSquare;

    const personelAdi = etkinlik.olusturan_personel?.tam_ad || 'Bilinmeyen Kullanıcı';
    
    const canEdit = 
        currentUser?.id === etkinlik.olusturan_personel_id &&
        new Date().getTime() - new Date(etkinlik.created_at).getTime() < 15 * 60 * 1000;

    const handleUpdate = (formData: FormData) => {
        startTransition(async () => {
            const result = await updateEtkinlikAction(etkinlik.id, formData);
            if (result.success && result.data) {
                setCurrentAciklama(result.data.aciklama);
                setIsEditing(false);
                toast.success("Not güncellendi.");
            } else {
                toast.error(result.error || "Güncelleme başarısız.");
            }
        });
    };

    return (
        <div className="flex gap-4 group">
            <div className="flex flex-col items-center">
                <span className="flex items-center justify-center w-10 h-10 bg-bg-subtle rounded-full">
                    <Icon className="text-accent" />
                </span>
                <div className="w-px h-full bg-bg-subtle"></div>
            </div>
            <div className="flex-1 pb-6">
                <div className="flex justify-between items-center">
                    <p className="font-bold text-primary">{etkinlik.etkinlik_tipi}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-text-main/60">{zamanFarki}</p>
                        {canEdit && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-main/60 hover:text-accent" title="Düzenle">
                                <FiEdit size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-sm text-text-main/80 mt-1">
                    <span className="font-semibold">{personelAdi}</span> tarafından oluşturuldu.
                </p>

                {isEditing ? (
                    <form action={handleUpdate} className="mt-2 space-y-2">
                        <textarea
                            name="aciklama"
                            defaultValue={currentAciklama}
                            rows={3}
                            className="w-full p-2 border rounded-md text-sm"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm">İptal</button>
                            <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm flex items-center gap-2 disabled:bg-green-400">
                                {isPending ? <FiLoader className="animate-spin" /> : <FiSave />} Kaydet
                            </button>
                        </div>
                    </form>
                ) : (
                    <p className="mt-2 p-3 bg-secondary/50 rounded-md text-text-main text-sm whitespace-pre-wrap">{currentAciklama}</p>
                )}
            </div>
        </div>
    );
}
