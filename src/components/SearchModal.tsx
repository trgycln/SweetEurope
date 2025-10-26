// src/components/SearchModal.tsx (NEUE DATEI)
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiSearch, FiX } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils'; // Annahme, dass Locale hier definiert ist

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    dictionary: Dictionary;
    locale: Locale;
}

export function SearchModal({ isOpen, onClose, dictionary, locale }: SearchModalProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const content = (dictionary as any).search || {};

    // Effekt, um das Suchfeld automatisch zu fokussieren, wenn das Modal geöffnet wird
    useEffect(() => {
        if (isOpen) {
            // Kurze Verzögerung, damit das Feld sichtbar ist, bevor der Fokus gesetzt wird
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Formular-Handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim().length > 0) {
            // Zur Suchergebnisseite weiterleiten
            router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
            onClose(); // Modal nach der Suche schließen
        }
    };

    // Tastatur-Handler (z.B. "Escape" zum Schließen)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) {
        return null; // Wenn nicht offen, nichts rendern
    }

    return (
        // Overlay (Vollbild)
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh] md:pt-[20vh] transition-opacity duration-300 ease-in-out"
            // KORREKTUR: 'animate-fadeIn' ist besser als nur opacity
            style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
            {/* Hintergrund-Overlay (zum Schließen klicken) */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Such-Container */}
            <div 
                className="relative z-10 w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Verhindert Schließen bei Klick auf Modal
            >
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        {/* Such-Icon im Feld */}
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <FiSearch className="text-gray-400" size={22} />
                        </div>
                        
                        {/* Such-Eingabefeld */}
                        <input
                            ref={inputRef}
                            type="search"
                            name="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={content.modalPlaceholder || "Wonach suchen Sie?"}
                            className="w-full p-6 pl-16 text-lg text-primary placeholder-gray-400 bg-secondary border-none focus:ring-2 focus:ring-accent"
                            autoComplete="off"
                        />

                        {/* Schließen-Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-400 hover:text-primary transition-colors"
                            aria-label={content.close || "Schließen"}
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                    {/* Optional: Suchergebnisse oder Vorschläge können hier angezeigt werden */}
                </form>
            </div>
        </div>
    );
}

// Füge dies zu deiner globalen CSS-Datei hinzu (z.B. globals.css),
// um das sanfte Einblenden zu gewährleisten:
/*
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
*/