"use client";

import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  dictionary: any;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, dictionary }) => {
  if (totalPages <= 1) {
    return null; // Eğer tek sayfa varsa, hiçbir şey gösterme
  }
  
  return (
    <div className="flex items-center justify-center gap-4 mt-12">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 font-bold text-primary bg-white rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        aria-label={dictionary.previous}
      >
        <FaChevronLeft size={12} />
        <span>{dictionary.previous}</span>
      </button>
      
      <span className="font-sans text-text-main">
        {dictionary.page} <strong>{currentPage}</strong> {dictionary.of} <strong>{totalPages}</strong>
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 font-bold text-primary bg-white rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        aria-label={dictionary.next}
      >
        <span>{dictionary.next}</span>
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default Pagination;