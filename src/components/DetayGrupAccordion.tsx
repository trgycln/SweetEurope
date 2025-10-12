'use client';

import React, { useState, ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface DetayGrupAccordionProps {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
}

export function DetayGrupAccordion({ title, icon, children, defaultOpen = false }: DetayGrupAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-primary transition-colors duration-200 hover:bg-gray-50"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-lg">{title}</span>
                </div>
                {isOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                    {children}
                </div>
            )}
        </div>
    );
}