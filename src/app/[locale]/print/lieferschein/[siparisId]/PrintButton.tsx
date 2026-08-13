'use client';

export default function PrintButton() {
    return (
        <button 
            onClick={() => {
                if (typeof window !== 'undefined') window.print();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
            Drucken
        </button>
    );
}
