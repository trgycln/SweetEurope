'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiCalendar, FiClock, FiUser } from 'react-icons/fi';

type TaskItem = {
    id: string;
    baslik: string;
    son_tarih: string | null;
    oncelik?: string | null;
    atanan_kisi_adi?: string | null;
};

interface GorevDurumWidgetProps {
    overdue: TaskItem[];
    upcoming: TaskItem[];
    myTasks?: TaskItem[];
    locale: string;
}

function fmt(date: string | null, locale: string): string {
    if (!date) return '—';
    try { return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short' }); }
    catch { return '—'; }
}

function daysLate(date: string | null): number {
    if (!date) return 0;
    return Math.ceil((Date.now() - new Date(date).getTime()) / 86400000);
}

function daysLeft(date: string | null): number {
    if (!date) return 0;
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

const PRIO_BADGE: Record<string, string> = {
    'Yüksek': 'bg-red-100 text-red-700',
    'Orta':   'bg-orange-100 text-orange-700',
    'Düşük':  'bg-green-100 text-green-700',
};

export default function GorevDurumWidget({ overdue, upcoming, myTasks, locale }: GorevDurumWidgetProps) {
    const [tab, setTab] = useState<'upcoming' | 'overdue' | 'mine'>('upcoming');

    const tabBtn = (t: 'upcoming' | 'overdue' | 'mine', label: string, count: number) => (
        <button
            type="button"
            onClick={() => setTab(t)}
            className={[
                'flex-1 py-2 text-sm font-semibold rounded-lg transition-colors',
                tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
        >
            {label}
            <span className={[
                'ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold',
                tab === t
                    ? t === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-500',
            ].join(' ')}>
                {count}
            </span>
        </button>
    );

    const items = tab === 'mine' ? (myTasks ?? []) : tab === 'upcoming' ? upcoming : overdue;

    return (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FiClock size={16} className="text-slate-500" /> Görev Durumu
                </h2>
                <Link href={`/${locale}/admin/gorevler`}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
                    Tümü →
                </Link>
            </div>

            {/* Tab bar */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-4 gap-1">
                {tabBtn('upcoming', '🕐 Yaklaşan', upcoming.length)}
                {tabBtn('overdue',  '⚠️ Gecikmiş', overdue.length)}
                {myTasks !== undefined && tabBtn('mine', '👤 Bana Atanan', myTasks.length)}
            </div>

            {/* Liste */}
            {items.length === 0 ? (
                <div className="text-center py-7">
                    <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                        <span className="text-green-600 text-lg">✓</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                        {tab === 'upcoming' ? 'Yaklaşan görev yok.' : 'Harika! Gecikmiş görev yok.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map(task => {
                        const late = tab === 'overdue';
                        const days = late ? daysLate(task.son_tarih) : daysLeft(task.son_tarih);
                        return (
                            <Link key={task.id} href={`/${locale}/admin/gorevler`}
                                className={[
                                    'flex items-start gap-3 p-3 rounded-xl border transition-colors group',
                                    late
                                        ? 'bg-red-50/50 border-red-100 hover:bg-red-50 hover:border-red-200'
                                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200',
                                ].join(' ')}>
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${late ? 'bg-red-500' : 'bg-blue-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
                                        {task.baslik}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className={`text-[11px] font-medium flex items-center gap-1 ${late ? 'text-red-600' : 'text-slate-500'}`}>
                                            {late ? <FiAlertCircle size={10} /> : <FiCalendar size={10} />}
                                            {late
                                                ? `${days} gün gecikmiş`
                                                : days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : `${days} gün kaldı`}
                                        </span>
                                        {task.atanan_kisi_adi && (
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <FiUser size={10} />{task.atanan_kisi_adi}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    {task.oncelik && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${PRIO_BADGE[task.oncelik] ?? 'bg-slate-100 text-slate-500'}`}>
                                            {task.oncelik}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400">{fmt(task.son_tarih, locale)}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
