'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiCpu, FiShield, FiTruck, FiTrendingUp, FiDollarSign, FiPlay, FiLoader } from 'react-icons/fi';

interface StartMeetingFormProps {
  onStartMeeting: (formData: FormData) => Promise<void>;
}

const DEPARTMENTS = [
  { id: 'legal', label: 'Gümrük & Hukuk', icon: FiShield, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'coo', label: 'Lojistik & Depo', icon: FiTruck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'cmo_horeca', label: 'HoReCa Satış', icon: FiTrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'cfo', label: 'Finans & Muhasebe', icon: FiDollarSign, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'it', label: 'IT & Sistem', icon: FiCpu, color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

export default function StartMeetingForm({ onStartMeeting }: StartMeetingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [topic, setTopic] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['legal', 'coo', 'cmo_horeca', 'cfo']);
  const [rounds, setRounds] = useState<number>(1);
  const router = useRouter();

  const toggleDept = (id: string) => {
    if (selectedDepts.includes(id)) {
      if (selectedDepts.length > 1) {
        setSelectedDepts(selectedDepts.filter(d => d !== id));
      }
    } else {
      setSelectedDepts([...selectedDepts, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('participants', JSON.stringify(selectedDepts));
    formData.append('rounds', rounds.toString());

    startTransition(async () => {
      try {
        await onStartMeeting(formData);
        setTopic('');
        router.refresh();
      } catch (err) {
        console.error('Toplantı başlatılırken hata:', err);
      }
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 relative overflow-hidden mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      {/* Decorative Gradient Blob */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <FiUsers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Yeni Yönetim Kurulu Toplantısı</h2>
            <p className="text-sm text-slate-500 mt-1">
              Yapay zeka direktörlerinizi yönlendirin ve stratejik kararlar alın.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1 transition-colors group-focus-within:text-blue-600">
              Gündem & Müzakere Konusu
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: Avrupa pazarında yeni çikolata serimizin lansman stratejisi..."
              required
              disabled={isPending}
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-300 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">
              Aktif Katılımcılar <span className="text-slate-400 font-normal lowercase">(CEO oturumu yönetir)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {DEPARTMENTS.map((dept) => {
                const isSelected = selectedDepts.includes(dept.id);
                const Icon = dept.icon;
                return (
                  <button
                    type="button"
                    key={dept.id}
                    disabled={isPending}
                    onClick={() => toggleDept(dept.id)}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'bg-white/10 text-white' : `${dept.bg} ${dept.color}`}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {dept.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 mt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Müzakere Derinliği:</span>
              <select
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                disabled={isPending}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={1}>1 Tur (Hızlı & Odaklı)</option>
                <option value={2}>2 Tur (Detaylı Analiz)</option>
                <option value={3}>3 Tur (Kapsamlı Karar)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending || !topic.trim()}
              className="w-full sm:w-auto relative group overflow-hidden inline-flex items-center justify-center gap-3 bg-slate-900 text-white font-semibold text-sm py-3.5 px-8 rounded-2xl transition-all shadow-[0_8px_20px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_25px_rgb(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {isPending ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin relative z-10" />
                  <span className="relative z-10">Müzakere Sürüyor...</span>
                </>
              ) : (
                <>
                  <FiPlay className="w-5 h-5 relative z-10" />
                  <span className="relative z-10 tracking-wide">Toplantıyı Başlat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
