// src/components/cok-dilli-input.tsx
'use client';
import { useState } from 'react';

type Lang = 'de' | 'tr' | 'en' | 'ar';
const diller: Lang[] = ['de', 'tr', 'en', 'ar'];

interface CokDilliInputProps {
  label: string;
  name: string;
  defaultValue?: any;
  type?: 'input' | 'textarea';
}

export function CokDilliInput({ label, name, defaultValue, type = 'input' }: CokDilliInputProps) {
    const [aktifDil, setAktifDil] = useState<Lang>('de');

    return (
        <div>
            <label className="block text-sm font-bold text-text-main/80 mb-2">{label}</label>
            <div className="flex items-center gap-2 mb-2">
                {diller.map(dil => (
                    <button 
                        type="button"
                        key={dil} 
                        onClick={() => setAktifDil(dil)}
                        className={`px-3 py-1 text-xs font-bold rounded-full ${aktifDil === dil ? 'bg-accent text-white' : 'bg-secondary'}`}
                    >
                        {dil.toUpperCase()}
                    </button>
                ))}
            </div>
            {diller.map(dil => {
                const inputProps = {
                    name: `${name}.${dil}`,
                    defaultValue: defaultValue?.[dil] || '',
                    className: `w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm ${aktifDil === dil ? 'block' : 'hidden'}`
                };
                return type === 'textarea' 
                    ? <textarea key={dil} {...inputProps} rows={4} />
                    : <input key={dil} type="text" {...inputProps} />
            })}
        </div>
    );
}