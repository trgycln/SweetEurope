'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

export interface CockpitApp {
    id: string;
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    badgeCount?: number;
    content: React.ReactNode;
}

interface Props {
    apps: CockpitApp[];
}

export default function CockpitAppGrid({ apps }: Props) {
    const [activeApp, setActiveApp] = useState<CockpitApp | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (activeApp) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [activeApp]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveApp(null);
            }
        };
        if (activeApp) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeApp]);

    const modalMarkup = (
        <AnimatePresence>
            {activeApp && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
                        onClick={() => setActiveApp(null)}
                    />

                    {/* Modal Container */}
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.94, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className={`relative flex flex-col bg-slate-50 shadow-2xl transition-all duration-200 overflow-hidden ${
                            isFullscreen
                                ? 'w-screen h-screen rounded-none fixed inset-0'
                                : 'w-full h-full sm:h-[88vh] sm:max-h-[920px] max-w-6xl sm:rounded-3xl border border-slate-200/80'
                        }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 z-10 shadow-xs">
                            <div className="flex items-center gap-3.5">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs ${activeApp.colorClass}`}>
                                    {activeApp.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                                            {activeApp.title}
                                        </h2>
                                        {activeApp.badgeCount !== undefined && activeApp.badgeCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
                                                {activeApp.badgeCount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium hidden sm:block">
                                        Modül Detayları &amp; Hızlı İşlemler
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Fullscreen Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    title={isFullscreen ? 'Pencere Boyutuna Dön' : 'Tam Ekran Yap'}
                                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                                >
                                    {isFullscreen ? (
                                        <>
                                            <FiMinimize2 size={16} />
                                            <span className="hidden sm:inline">Normal Boyut</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiMaximize2 size={16} />
                                            <span className="hidden sm:inline">Tam Ekran</span>
                                        </>
                                    )}
                                </button>

                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={() => setActiveApp(null)}
                                    title="Kapat (Esc)"
                                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body (Scrollable with ample space) */}
                        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto flex-1 bg-gradient-to-b from-slate-50 to-slate-100/50">
                            {activeApp.content}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative">
            {/* App Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {apps.map((app) => (
                    <button
                        key={app.id}
                        type="button"
                        onClick={() => setActiveApp(app)}
                        className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all active:scale-95 group relative cursor-pointer text-left"
                    >
                        {app.badgeCount !== undefined && app.badgeCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs z-10 animate-pulse">
                                {app.badgeCount}
                            </span>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl group-hover:scale-105 transition-transform shadow-xs ${app.colorClass}`}>
                            {app.icon}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 text-center leading-tight">
                            {app.title}
                        </span>
                    </button>
                ))}
            </div>

            {/* Modal via Portal to avoid any container clipping/transform bugs */}
            {mounted && createPortal(modalMarkup, document.body)}
        </div>
    );
}
