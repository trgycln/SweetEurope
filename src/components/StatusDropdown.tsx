// src/components/StatusDropdown.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { PartnerSalesStatus } from '@/app/admin/partners/actions';
import { FaChevronDown, FaSpinner } from 'react-icons/fa';

interface StatusDropdownProps {
    currentStatus: PartnerSalesStatus;
    statuses: PartnerSalesStatus[];
    partnerId: string;
    /** Die Server Action, die den Status in der Datenbank aktualisiert */
    updateAction: (partnerId: string, newStatus: PartnerSalesStatus) => Promise<any>;
}

export function StatusDropdown({ currentStatus, statuses, partnerId, updateAction }: StatusDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [localStatus, setLocalStatus] = useState<PartnerSalesStatus>(currentStatus);
    const [isError, setIsError] = useState(false);

    const handleStatusChange = (newStatus: PartnerSalesStatus) => {
        if (newStatus === localStatus) {
            setIsOpen(false);
            return;
        }

        setLocalStatus(newStatus);
        setIsOpen(false);
        setIsError(false);

        startTransition(async () => {
            const result = await updateAction(partnerId, newStatus);
            
            if (result && !result.success) {
                // Wenn die Server Action einen Fehler zurückgibt
                setIsError(true);
                // Status zurücksetzen, da das Update fehlgeschlagen ist
                setLocalStatus(currentStatus);
                console.error("Status Update fehlgeschlagen:", result.message);
            }
        });
    };

    const getStatusColor = (status: PartnerSalesStatus) => {
        switch (status) {
            case 'Anlaşıldı': return 'bg-green-100 text-green-800';
            case 'Potansiyel': return 'bg-yellow-100 text-yellow-800';
            case 'Teklif aşamasında': return 'bg-blue-100 text-blue-800';
            case 'Numune gönderildi': return 'bg-indigo-100 text-indigo-800';
            case 'İlgilenmiyor': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                className={`inline-flex justify-between items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${getStatusColor(localStatus)} ${isError ? 'border-red-500 ring-red-500' : 'focus:ring-indigo-500'}`}
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                aria-expanded={isOpen}
            >
                {isPending ? (
                    <FaSpinner className="animate-spin mr-2" />
                ) : (
                    <span className="truncate">{localStatus}</span>
                )}
                <FaChevronDown className={`-mr-1 ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {statuses.map((status) => (
                            <button
                                key={status}
                                className={`block w-full text-left px-4 py-2 text-sm ${status === localStatus ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                                onClick={() => handleStatusChange(status)}
                                role="menuitem"
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {isError && (
                 <p className="text-red-500 text-xs mt-1">Update fehlgeschlagen.</p>
            )}
        </div>
    );
}