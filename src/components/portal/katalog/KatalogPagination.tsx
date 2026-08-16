import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    locale: string;
}

export function KatalogPagination({ currentPage, totalPages, onPageChange, locale }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    // Simple pagination logic: show current, first, last, and +/- 2 surrounding pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pages.push(i);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pages.push('...');
        }
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-8">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
                {locale === 'de' ? 'Zurück' : 'Önceki'}
            </button>
            
            <div className="flex items-center gap-1 mx-2">
                {pages.map((p, i) => (
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
                                p === currentPage 
                                    ? 'bg-accent text-white font-bold' 
                                    : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        >
                            {p}
                        </button>
                    )
                ))}
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
                {locale === 'de' ? 'Weiter' : 'Sonraki'}
            </button>
        </div>
    );
}
