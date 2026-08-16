'use client';

import React, { useState } from 'react';
import { FiX, FiDownload, FiExternalLink, FiMaximize2 } from 'react-icons/fi';
import { LuFileText, LuTag } from 'react-icons/lu';

interface LabelModalProps {
    pdfUrl: string;
    productTitle: string;
    isOpen: boolean;
    onClose: () => void;
    locale?: string;
}

export function LabelModal({
    pdfUrl,
    productTitle,
    isOpen,
    onClose,
    locale = 'de'
}: LabelModalProps) {
    if (!isOpen) return null;

    const t = {
        de: {
            title: 'Original-Produktetikett',
            download: 'PDF Herunterladen',
            openTab: 'In neuem Tab öffnen',
            close: 'Schließen',
            subtitle: 'Offizielles Druck- und Verpackungsetikett'
        },
        tr: {
            title: 'Orijinal Ürün Etiketi',
            download: 'PDF İndir',
            openTab: 'Yeni Sekmede Aç',
            close: 'Kapat',
            subtitle: 'Resmi Baskı ve Ambalaj Etiketi'
        },
        en: {
            title: 'Original Product Label',
            download: 'Download PDF',
            openTab: 'Open in New Tab',
            close: 'Close',
            subtitle: 'Official Packaging & Artwork Label'
        }
    }[locale as 'de' | 'tr' | 'en'] || {
        title: 'Original-Produktetikett',
        download: 'PDF Herunterladen',
        openTab: 'In neuem Tab öffnen',
        close: 'Schließen',
        subtitle: 'Offizielles Druck- und Verpackungsetikett'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Background Backdrop click */}
            <div className="fixed inset-0" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative z-10 flex flex-col w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                            <LuTag size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base leading-tight">
                                {t.title}: {productTitle}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-sans">
                                {t.subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={pdfUrl}
                            download
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                            title={t.download}
                        >
                            <FiDownload size={13} />
                            <span>{t.download}</span>
                        </a>
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                            title={t.openTab}
                        >
                            <FiExternalLink size={13} />
                            <span className="hidden sm:inline">{t.openTab}</span>
                        </a>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                            title={t.close}
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Body */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden">
                    <iframe
                        src={`${pdfUrl}#toolbar=1&navpanes=0`}
                        className="w-full h-full border-0"
                        title={productTitle}
                    />
                </div>
            </div>
        </div>
    );
}
