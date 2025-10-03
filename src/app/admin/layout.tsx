"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dictionary } from '@/dictionaries/de';
import { CgMenuRight, CgClose } from 'react-icons/cg';

const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return <Link href={href} className={`${isActive ? 'bg-accent text-primary' : 'hover:bg-gray-700'} p-3 rounded-md font-bold transition-colors block`}>{children}</Link>;
};

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
  const content = dictionary.adminDashboard;
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-secondary">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`w-64 bg-primary text-secondary flex-col p-4 fixed md:static h-full z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-shrink-0`}>
        <h1 className="font-serif text-2xl font-bold mb-8 text-center">
          <Link href="/admin/applications">{content.title}</Link>
        </h1>
        <nav className="flex flex-col space-y-2">
          <NavLink href="/admin/applications">{content.sidebar.applications}</NavLink>
          <NavLink href="/admin/products">{content.sidebar.products}</NavLink>
          <NavLink href="/admin/orders">{content.sidebar.orders}</NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 flex justify-between items-center bg-white p-4 shadow-md flex-shrink-0">
          <h1 className="font-serif text-xl font-bold text-primary">{content.title}</h1>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <CgClose size={24} /> : <CgMenuRight size={24} />}
          </button>
        </header>
        {/* Scrollable Main Content */}
        <main className="flex-1 p-8 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}