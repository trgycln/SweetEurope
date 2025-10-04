// src/components/DeleteButton.tsx
"use client"; // Da dies Interaktionselemente enthält, ist es wahrscheinlich ein Client Component

import React, { useState } from 'react';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';

interface DeleteButtonProps {
    /** Der Name des zu löschenden Elements (z.B. 'Partner' oder 'Bestellung') */
    name: string;
    /** Optional: Text für die Schaltfläche */
    buttonText?: string;
}

/**
 * Ein universeller Löschbutton mit einer Bestätigungslogik (Modal-Stil).
 * Er muss in einem <form>-Tag verwendet werden, das die Server Action enthält.
 */
export function DeleteButton({ name, buttonText = 'Löschen' }: DeleteButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (isConfirming) {
        return (
            <div className="flex items-center space-x-2 p-2 bg-red-100 rounded-lg shadow-inner">
                <FaExclamationTriangle className="text-red-500 w-5 h-5" />
                <span className="text-sm text-red-700">Wirklich {name} löschen?</span>
                
                {/* 1. Bestätigungs-Button: Löst die äußere Server Action aus */}
    <button
        type="submit" 
        className="bg-red-600 text-white text-xs py-1 px-3 rounded hover:bg-red-700 transition"
        // onClick={() => setIsConfirming(false)} <<< DIES MUSS ENTFERNT WERDEN!
    >
        Ja, löschen
    </button>
                
                {/* 2. Abbrechen-Button */}
                <button
                    type="button" 
                    className="bg-gray-300 text-gray-800 text-xs py-1 px-3 rounded hover:bg-gray-400 transition"
                    onClick={() => setIsConfirming(false)}
                >
                    Abbrechen
                </button>
            </div>
        );
    }

    return (
        // Dies ist der initiale Button. Er ist NICHT type="submit", damit er zuerst die Bestätigung anzeigt.
        // Das submit-Formular wird nur im isConfirming-Zustand gerendert!
        <button
            type="button" 
            className="text-red-600 hover:text-red-800 transition duration-150 p-2 flex items-center space-x-1"
            title={`Lösche ${name}`}
            onClick={() => setIsConfirming(true)}
        >
            <FaTrash className="w-5 h-5" />
            {/* Optionaler Text, falls buttonText gesetzt ist */}
            {buttonText !== 'Löschen' && <span>{buttonText}</span>}
        </button>
    );
}