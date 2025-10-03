"use client";

import React, { useEffect } from 'react';
import { CgClose } from 'react-icons/cg';
import { FaSearch } from 'react-icons/fa';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  dictionary: any;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, dictionary }) => {
  useEffect(() => {
    // Escape tuşuna basıldığında arama katmanını kapat
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-primary bg-opacity-95 z-50 flex items-center justify-center animate-fade-in" 
      role="dialog" 
      aria-modal="true"
    >
      <button 
        onClick={onClose} 
        className="absolute top-8 right-8 text-secondary hover:text-accent transition-colors" 
        aria-label={dictionary.search.close}
      >
        <CgClose size={32} />
      </button>

      <div className="relative w-full max-w-2xl px-6">
        <input
          type="search"
          placeholder={dictionary.search.placeholder}
          className="w-full bg-transparent border-b-2 border-secondary focus:border-accent text-3xl md:text-4xl text-secondary placeholder:text-gray-500 py-4 outline-none transition-colors"
          autoFocus
        />
        <FaSearch className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-2xl" />
      </div>
    </div>
  );
};

export default SearchOverlay;

