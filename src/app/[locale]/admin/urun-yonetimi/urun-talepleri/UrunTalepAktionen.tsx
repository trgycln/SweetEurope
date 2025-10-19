// src/app/[locale]/admin/urun-yonetimi/urun-talepleri/UrunTalepAktionen.tsx (NEUE DATEI)
'use client';

import React, { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { FiLoader, FiEdit, FiSave, FiX, FiCheckCircle, FiPackage } from 'react-icons/fi';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { adminUpdateUrunTalepAction } from '@/app/actions/yeni-urun-actions'; // Admin-Action importieren

type Talep = Tables<'yeni_urun_talepleri'>;
type StatusKey = Enums<'urun_talep_durumu'>;

export default function UrunTalepAktionen({ talep }: { talep: Talep }) {
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false); // Zustand für Bearbeitungsmodus (Notiz)
    const notizRef = useRef<HTMLTextAreaElement>(null); // Ref für Textarea
    
    // Alle möglichen Status-Optionen
    const statusOptionen: StatusKey[] = ['Yeni', 'Değerlendiriliyor', 'Onaylandı', 'Reddedildi'];

    // Handler für Statusänderung (Dropdown)
    const handleStatusChange = (neuerStatus: StatusKey) => {
        // Wenn kein Notizfeld vorhanden ist, direkt speichern
        if (neuerStatus !== 'Reddedildi' || !notizRef.current) {
             startTransition(async () => {
                const formData = new FormData();
                formData.append('status', neuerStatus);
                formData.append('admin_notu', talep.admin_notu || ''); // Vorhandene Notiz beibehalten
                
                const result = await adminUpdateUrunTalepAction(talep.id, formData);
                if (result.success) toast.success(result.message);
                else toast.error(result.error);
            });
        }
    };

    // Handler für das Speichern der Notiz (im Bearbeitungsmodus)
    const handleSaveNote = () => {
        const adminNotu = notizRef.current?.value || '';
        const aktuellerStatus = talep.status;

        startTransition(async () => {
            const formData = new FormData();
            formData.append('status', aktuellerStatus);
            formData.append('admin_notu', adminNotu);
            
            const result = await adminUpdateUrunTalepAction(talep.id, formData);
            if (result.success) {
                toast.success("Notiz gespeichert.");
                setIsEditing(false); // Bearbeitungsmodus beenden
            } else {
                toast.error(result.error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-2 items-start">
            {/* Status-Dropdown */}
            <select
                value={talep.status}
                onChange={(e) => handleStatusChange(e.target.value as StatusKey)}
                disabled={isPending || isEditing}
                className="w-full text-xs p-1 border rounded-md bg-gray-50 disabled:opacity-70"
            >
                {statusOptionen.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
            
            {/* Notiz-Anzeige und Bearbeiten-Button */}
            {isEditing ? (
                // Bearbeitungsmodus
                <div className="w-full space-y-1">
                    <textarea
                        ref={notizRef}
                        defaultValue={talep.admin_notu || ''}
                        placeholder="Feedback für Partner eingeben..."
                        className="w-full text-xs p-2 border rounded-md bg-white"
                        rows={3}
                        disabled={isPending}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleSaveNote} disabled={isPending} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                            {isPending ? <FiLoader className="animate-spin" /> : <FiSave size={14} />}
                        </button>
                        <button onClick={() => setIsEditing(false)} disabled={isPending} className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                            <FiX size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                // Anzeige-Modus
                <div className="w-full">
                    {talep.admin_notu && (
                        <p className="text-xs italic text-gray-500 truncate" title={talep.admin_notu}>
                            Notiz: {talep.admin_notu}
                        </p>
                    )}
                    <button onClick={() => setIsEditing(true)} className="text-xs text-accent hover:underline">
                        {talep.admin_notu ? "Notiz bearbeiten" : "Notiz hinzufügen"}
                    </button>
                </div>
            )}
        </div>
    );
}