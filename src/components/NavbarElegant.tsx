"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';
import { CgMenuRight, CgClose } from "react-icons/cg";
import MegaMenu from './MegaMenu';

// Navbar'ın ihtiyaç duyduğu metinlerin tipini tanımlıyoruz
interface NavDictionary {
  navigation: {
    home: string;
    products: string;
    about: string;
    contact: string;
    partnerPortal: string;
  };
  topBar: {
    announcement: string;
  };
  megaMenu: any; // MegaMenu kendi içinde tipini yönettiği için 'any' kalabilir
}

const NavbarElegant: React.FC<{ dictionary: NavDictionary }> = ({ dictionary }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navLinks = [
    { href: '/', label: dictionary.navigation.home },
    { href: '/produkte', label: dictionary.navigation.products },
    { href: '/ueber-uns', label: dictionary.navigation.about },
    { href: '/kontakt', label: dictionary.navigation.contact },
  ];

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-bg-subtle text-primary text-center py-2 px-6">
        <p className="font-sans text-sm italic">
          {dictionary.topBar.announcement}
        </p>
      </div>

      {/* Main Navigation */}
      <div className="bg-primary text-secondary shadow-md relative">
        <nav className="container mx-auto px-6 h-20 flex justify-between items-center">
          {/* Left Links (Desktop) */}
          <div className="hidden md:flex items-center justify-start space-x-8 w-1/3">
            <Link href="/" className="font-sans text-lg hover:text-accent transition-colors">
              {dictionary.navigation.home}
            </Link>
            
            <div className="group h-full flex items-center">
              <Link href="/produkte" className="font-sans text-lg hover:text-accent transition-colors flex items-center gap-1">
                {dictionary.navigation.products}
                <FaChevronDown size={12} className="opacity-70 transition-transform group-hover:rotate-180 duration-300" />
              </Link>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-[90vw] max-w-6xl pt-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300">
                 <MegaMenu dictionary={dictionary} />
              </div>
            </div>
          </div>

          {/* Centered Logo */}
          <div className="w-auto md:w-1/3 text-center md:text-center">
            <Link href="/" className="text-3xl font-serif font-bold hover:text-accent transition-colors">
              ElysonSweets
            </Link>
          </div>

          {/* Right Actions (Desktop) */}
          <div className="hidden md:flex items-center justify-end space-x-6 w-1/3">
             <Link href="/ueber-uns" className="font-sans text-lg hover:text-accent transition-colors">
                {dictionary.navigation.about}
              </Link>
             <Link href="/kontakt" className="font-sans text-lg hover:text-accent transition-colors">
                {dictionary.navigation.contact}
              </Link>
            <div className="relative group">
              <button className="flex items-center hover:text-accent transition-colors">
                <FaGlobe size={20} />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-secondary text-primary rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible">
                <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">Deutsch (DE)</a>
                <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">English (EN)</a>
                <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">Türkçe (TR)</a>
                <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">العربية (AR)</a>
              </div>
            </div>
            <Link href="/login" className="bg-accent text-primary font-bold py-2 px-4 rounded-md text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
              {dictionary.navigation.partnerPortal}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menüyü aç">
              <CgMenuRight size={28} />
            </button>
          </div>
        </nav>
      </div>

       {/* Mobil Menü Paneli */}
       <div className={`md:hidden fixed inset-0 bg-primary z-50 transition-transform transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center p-6 h-20">
             <Link href="/" className="text-3xl font-serif font-bold text-secondary" onClick={() => setIsMenuOpen(false)}>
              ElysonSweets
            </Link>
            <button onClick={() => setIsMenuOpen(false)}>
              <CgClose size={32} className="text-secondary"/>
            </button>
          </div>
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] space-y-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-serif text-4xl text-secondary hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
             <div className="border-t border-gray-600 w-1-2 my-4"></div>
             <Link href="/login" className="bg-accent text-primary font-bold py-3 px-6 rounded-md text-lg hover:opacity-90 transition-opacity">
              {dictionary.navigation.partnerPortal}
            </Link>
         </div>
      </div>
    </header>
  );
};

export default NavbarElegant;