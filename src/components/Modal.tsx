// src/components/Modal.tsx
"use client";

import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        // Sabit konumlu arka plan (overlay)
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" 
            onClick={onClose} // Arka plana tıklayınca kapat
        >
            {/* Modal içeriği (onClick olayını durdurarak modal dışındaki tıklamayı engeller) */}
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all p-6"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Modal Başlığı ve Kapatma Butonu */}
                <header className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white">
                    <h2 className="text-xl font-serif font-bold text-primary">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-500 hover:text-red-600 transition-colors"
                        title="Kapat"
                    >
                        <FaTimes size={20} />
                    </button>
                </header>

                {/* Modal'a gönderilen içerik (Formumuz buraya yerleşecek) */}
                <div className="pt-2">
                    {children}
                </div>
            </div>
        </div>
    );
}