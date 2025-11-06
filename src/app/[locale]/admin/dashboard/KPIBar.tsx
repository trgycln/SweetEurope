import Link from 'next/link';
import React from 'react';

type KPI = {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
};

export default function KPIBar({ items }: { items: KPI[] }) {
  const toneClass = (tone?: KPI['tone']) => {
    switch (tone) {
      case 'positive': return 'text-emerald-700';
      case 'negative': return 'text-red-600';
      case 'accent': return 'text-indigo-700';
      default: return 'text-primary';
    }
  };

  const content = (item: KPI) => (
    <div className="flex flex-col">
  <span className={`text-2xl md:text-3xl font-bold whitespace-nowrap ${toneClass(item.tone)}`}>{item.value}</span>
      <span className="text-xs md:text-sm text-text-main/70 mt-1">{item.label}</span>
      {item.hint && <span className="text-[10px] text-text-main/60 mt-0.5">{item.hint}</span>}
    </div>
  );

  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-lg border border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        {items.map((item, idx) => (
          <div key={idx} className="min-w-0">
            {item.href ? (
              <Link href={item.href} className="block group">
                {content(item)}
              </Link>
            ) : content(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
