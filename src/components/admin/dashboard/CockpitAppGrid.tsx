'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

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

    return (
        <div className="relative">
            {/* App Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {apps.map((app) => (
                    <button
                        key={app.id}
                        onClick={() => setActiveApp(app)}
                        className="flex flex-col items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 group relative"
                    >
                        {app.badgeCount !== undefined && app.badgeCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 animate-pulse">
                                {app.badgeCount}
                            </span>
                        )}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl group-hover:scale-105 transition-transform ${app.colorClass}`}>
                            {app.icon}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 text-center leading-tight">
                            {app.title}
                        </span>
                    </button>
                ))}
            </div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {activeApp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setActiveApp(null)}
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full max-w-5xl max-h-full bg-slate-50 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeApp.colorClass}`}>
                                        {activeApp.icon}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">{activeApp.title}</h2>
                                </div>
                                <button
                                    onClick={() => setActiveApp(null)}
                                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Body (Scrollable) */}
                            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                                {activeApp.content}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
