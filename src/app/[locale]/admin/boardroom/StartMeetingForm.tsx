'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiCpu, FiShield, FiTruck, FiTrendingUp, FiDollarSign, FiPlay, FiLoader } from 'react-icons/fi';

interface StartMeetingFormProps {
  onStartMeeting: (formData: FormData) => Promise<void>;
}

const DEPARTMENTS = [
  { id: 'legal', label: 'Gümrük & Hukuk', icon: FiShield, color: 'text-amber-600' },
  { id: 'coo', label: 'Lojistik & Depo', icon: FiTruck, color: 'text-emerald-600' },
  { id: 'cmo_horeca', label: 'HoReCa Satış', icon: FiTrendingUp, color: 'text-purple-600' },
  { id: 'cfo', label: 'Finans & Muhasebe', icon: FiDollarSign, color: 'text-blue-600' },
  { id: 'it', label: 'IT & Sistem/Ajan HR', icon: FiCpu, color: 'text-rose-600' },
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <FiUsers className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Yeni Yönetim Kurulu Toplantısı</h2>
          <p className="text-xs text-slate-500">
            Groq Llama 3.3 motoru ve kota kontrollü kademeli müzakere
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Gündem & Karar Alınacak Konu
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Örn: 24 Eylül Köln Wahn gümrüğüne inecek ilk parti için öncelikli satış ve mevzuat planı..."
            required
            disabled={isPending}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
          />
        </div>

        {/* Katılımcı Departmanlar */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Masaya Oturacak Departmanlar (CEO otomatik yönetir)
          </label>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => {
              const isSelected = selectedDepts.includes(dept.id);
              const Icon = dept.icon;
              return (
                <button
                  type="button"
                  key={dept.id}
                  disabled={isPending}
                  onClick={() => toggleDept(dept.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={isSelected ? 'text-blue-300' : dept.color} />
                  {dept.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Müzakere Turu & Buton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Müzakere Derinliği:</span>
            <select
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              disabled={isPending}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none"
            >
              <option value={1}>1 Tur (Hızlı, Odaklı & Kota Dostu)</option>
              <option value={2}>2 Tur (Detaylı Müzakere)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending || !topic.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin" />
                <span>Toplantı Sürüyor (Ajanlar Müzakere Ediyor...)</span>
              </>
            ) : (
              <>
                <FiPlay className="w-4 h-4" />
                <span>Toplantıyı Başlat</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
