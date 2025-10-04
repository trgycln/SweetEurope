// src/app/admin/partners/StatusDropdown.tsx
"use client";

import React, { useState } from 'react';
import { PartnerSalesStatus, PartnerActionState, updatePartnerSalesStatus } from './actions';
import { FaSyncAlt } from 'react-icons/fa';

interface StatusDropdownProps {
    partnerId: string;
    currentStatus: PartnerSalesStatus;
}

const statusOptions: PartnerSalesStatus[] = [
    'İlk Temas', 
    'Numune gönderildi', 
    'Teklif aşamasında', 
    'Potansiyel', 
    'Anlaşıldı', 
    'İlgilenmiyor'
];

export function StatusDropdown({ partnerId, currentStatus }: StatusDropdownProps) {
    const [status, setStatus] = useState<PartnerSalesStatus>(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as PartnerSalesStatus;
        
        setIsUpdating(true);
        setMessage(null);
        setStatus(newStatus); // Optimistisches Update

        const result: PartnerActionState = await updatePartnerSalesStatus(partnerId, newStatus);
        
        setIsUpdating(false);
        if (result.success) {
            setMessage('Aktualisiert!');
        } else {
            // Bei Fehler: Status zurücksetzen und Fehlermeldung anzeigen
            setStatus(currentStatus); 
            setMessage(`Fehler: ${result.message}`);
        }

        setTimeout(() => setMessage(null), 3000);
    };

    const getStatusColor = (s: PartnerSalesStatus): string => {
        switch (s) {
            case 'Anlaşıldı': return 'bg-green-100 text-green-800 border-green-400';
            case 'Potansiyel': return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'Numune gönderildi': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
            case 'Teklif aşamasında': return 'bg-purple-100 text-purple-800 border-purple-400';
            case 'İlgilenmiyor': return 'bg-red-100 text-red-800 border-red-400';
            case 'İlk Temas':
            default: return 'bg-gray-100 text-gray-800 border-gray-400';
        }
    };

    return (
        <div className="flex flex-col space-y-1">
            <select
                value={status}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className={`py-1 px-2 border rounded-md text-sm cursor-pointer focus:ring-primary focus:border-primary ${getStatusColor(status)}`}
            >
                {statusOptions.map(option => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            {isUpdating && (
                <div className="flex items-center text-xs text-blue-600">
                    <FaSyncAlt className="animate-spin mr-1" /> Wird gespeichert...
                </div>
            )}
            {message && !isUpdating && (
                <p className={`text-xs ${message.startsWith('Fehler') ? 'text-red-600' : 'text-green-600'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}