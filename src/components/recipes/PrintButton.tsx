'use client';

import { FiPrinter } from 'react-icons/fi';

type PrintButtonProps = {
  label: string;
};

export default function PrintButton({ label }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-all shadow-sm print:hidden"
      title={label}
    >
      <FiPrinter className="w-4 h-4 text-amber-600" />
      <span>{label}</span>
    </button>
  );
}
