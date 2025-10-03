"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { FaGlobe } from 'react-icons/fa';

const Navbar: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: dictionary.navigation.home },
    { href: '/produkte', label: dictionary.navigation.products },
    { href: '/ueber-uns', label: dictionary.navigation.about },
    { href: '/kontakt', label: dictionary.navigation.contact },
  ];

  return (
    <header className="bg-primary text-secondary shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-serif font-bold">
          <Link href="/" className="hover:text-accent transition-colors">
            SweetHeaven
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-sans text-lg hover:text-accent transition-colors">
              {link.label}
            </Link>
          ))}
          {/* Language Switcher */}
          <div className="relative group">
            <button className="flex items-center space-x-1 hover:text-accent transition-colors">
              <FaGlobe />
              <span>DE</span>
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-secondary text-primary rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 invisible group-hover:visible">
              <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">Deutsch (DE)</a>
              <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">English (EN)</a>
              <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">Türkçe (TR)</a>
              <a href="#" className="block px-4 py-2 text-sm hover:bg-bg-subtle">العربية (AR)</a>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menüyü aç">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
            </svg>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden bg-primary pb-4">
          <div className="flex flex-col items-center space-y-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-sans text-lg hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

