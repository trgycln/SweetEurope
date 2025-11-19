'use client';

import { useState, useTransition } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { FiEdit, FiTrash2, FiSave, FiX, FiUser, FiMail, FiPhone, FiBriefcase, FiLoader } from 'react-icons/fi';
import { guncelleKisiAction, silKisiAction } from './actions';
import { toast } from 'sonner';

interface KisiKartiProps {
    kisi: Tables<'dis_kontaklar'>;
}

export default function KisiKarti({ kisi }: KisiKartiProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleUpdate = async (formData: FormData) => {
        startTransition(async () => {
            const result = await guncelleKisiAction(kisi.id, formData);
            if (result.success) {
                toast.success(result.message);
                setIsEditing(false);
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleDelete = async () => {
        if (window.confirm(`${kisi.ad_soyad} adlı kişiyi silmek istediğinizden emin misiniz?`)) {
            startTransition(async () => {
                const result = await silKisiAction(kisi.id, kisi.firma_id);
                if (result.success) {
                    toast.success(result.message);
                } else {
                    toast.error(result.message);
                }
            });
        }
    };

    const inputClasses = "w-full bg-white border border-bg-subtle rounded-lg p-2 text-sm focus:ring-2 focus:ring-accent";

    if (isEditing) {
        return (
            <form action={handleUpdate} className="bg-secondary p-4 rounded-lg border border-accent animate-fade-in">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                        <FiEdit className="text-accent text-2xl" />
                    </div>
                    <div className="flex-grow space-y-2">
                        <input type="text" name="ad_soyad" defaultValue={kisi.ad_soyad} required className={`${inputClasses} font-bold`} />
                        <input type="text" name="unvan" defaultValue={kisi.unvan || ''} placeholder="Ünvan" className={inputClasses} />
                        <input type="email" name="email" defaultValue={kisi.email || ''} placeholder="E-posta" className={inputClasses} />
                        <input type="tel" name="telefon" defaultValue={kisi.telefon || ''} placeholder="Telefon" className={inputClasses} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-200 rounded-md text-sm font-bold"><FiX/></button>
                    <button type="submit" disabled={isPending} className="px-4 py-1 bg-green-600 text-white rounded-md text-sm font-bold flex items-center gap-2 disabled:bg-green-400">
                        {isPending ? <FiLoader className="animate-spin"/> : <FiSave />} Kaydet
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="bg-secondary/50 p-4 rounded-lg border flex items-start gap-4 group">
            <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                <FiUser className="text-accent text-2xl" />
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-primary">{kisi.ad_soyad}</h3>
                {kisi.unvan && (
                    <div className="flex items-center gap-2 text-sm text-text-main/70 mt-1">
                        <FiBriefcase size={14} /> <span>{kisi.unvan}</span>
                    </div>
                )}
                <div className="mt-2 space-y-1 text-sm">
                    {kisi.email && (
                        <div className="flex items-center gap-2 text-text-main">
                            <FiMail size={14} className="text-gray-400" />
                            <a href={`mailto:${kisi.email}`} className="hover:text-accent">{kisi.email}</a>
                        </div>
                    )}
                    {kisi.telefon && (
                        <div className="flex items-center gap-2 text-text-main">
                            <FiPhone size={14} className="text-gray-400" />
                            <span>{kisi.telefon}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsEditing(true)} className="p-2 bg-white rounded-md shadow hover:bg-gray-100"><FiEdit size={14} /></button>
                <button onClick={handleDelete} disabled={isPending} className="p-2 bg-white rounded-md shadow hover:bg-red-100 disabled:opacity-50">
                    {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiTrash2 size={14} className="text-red-600"/>}
                </button>
            </div>
        </div>
    );
}
