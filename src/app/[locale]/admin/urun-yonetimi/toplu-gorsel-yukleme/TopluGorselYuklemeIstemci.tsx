'use client';

import { useState } from 'react';
import TopluGorselYuklemeClient from './TopluGorselYuklemeClient';
import OtomatikGorselEslestirme from './OtomatikGorselEslestirme';

type Mod = 'standart' | 'otomatik';

export default function TopluGorselYuklemeIstemci() {
  const [mod, setMod] = useState<Mod>('standart');

  return (
    <div className="space-y-4">
      {/* Tab Seçici */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMod('standart')}
          className={`flex-1 py-2.5 transition-colors ${
            mod === 'standart'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          Standart Yükleme
        </button>
        <button
          type="button"
          onClick={() => setMod('otomatik')}
          className={`flex-1 py-2.5 transition-colors ${
            mod === 'otomatik'
              ? 'bg-violet-700 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          Otomatik Eşleştirme
        </button>
      </div>

      {mod === 'standart' && <TopluGorselYuklemeClient />}
      {mod === 'otomatik' && <OtomatikGorselEslestirme />}
    </div>
  );
}
