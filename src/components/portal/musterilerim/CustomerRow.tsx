'use client';

import React from 'react';
import Link from 'next/link';
import { FiPhone, FiMail, FiShoppingCart, FiMapPin } from 'react-icons/fi';
import { FaInstagram } from 'react-icons/fa';

interface Customer {
  id: string;
  unvan: string;
  telefon?: string | null;
  email?: string | null;
  kategori?: string | null;
  status?: string | null;
  created_at?: string;
  adres?: string | null;
  sehir?: string | null;
  ilce?: string | null;
  posta_kodu?: string | null;
  kaynak?: string | null;
  oncelik?: string | null;
  oncelik_puani?: number | null;
  etiketler?: string[] | null;
  son_etkilesim_tarihi?: string | null;
  google_maps_url?: string | null;
  instagram_url?: string | null;
}

interface CustomerRowProps {
  customer: Customer;
  locale: string;
  statusColors: Record<string, string>;
  isDesktop?: boolean;
  labels: {
    createOrder: string;
    notAssigned?: string;
  };
}

const KATEGORI_RENKLERI: Record<string, string> = {
  "Kafe": "bg-amber-100 text-amber-800",
  "Restoran": "bg-orange-100 text-orange-800",
  "Otel": "bg-blue-100 text-blue-800",
  "Market": "bg-teal-100 text-teal-800",
  "Alt Bayi": "bg-purple-100 text-purple-800",
  "Catering": "bg-rose-100 text-rose-800",
};

export default function CustomerRow({ 
  customer, 
  locale, 
  statusColors,
  isDesktop = false,
  labels
}: CustomerRowProps) {

  if (!isDesktop) {
    // Mobile Card View
    return (
      <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-accent hover:shadow-xl hover:-translate-y-1 transition-all">
        <Link href={`/${locale}/portal/musterilerim/${customer.id}`} className="block">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-serif text-lg font-bold text-primary hover:text-accent transition-colors">
                {customer.unvan}
              </h3>
              {customer.kategori && (
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mt-2 ${KATEGORI_RENKLERI[customer.kategori] || 'bg-gray-100 text-gray-800'}`}>
                  {customer.kategori}
                </span>
              )}
            </div>
            {customer.status && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ml-2 ${statusColors[customer.status] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                {customer.status}
              </span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
            {customer.telefon && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${customer.telefon}`;
                }}
                className="flex items-center gap-2 text-gray-700 hover:text-accent transition-colors cursor-pointer"
              >
                <FiPhone size={14} className="text-gray-400" />
                <span>{customer.telefon}</span>
              </div>
            )}
            {customer.email && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${customer.email}`;
                }}
                className="flex items-center gap-2 text-gray-700 hover:text-accent transition-colors cursor-pointer"
              >
                <FiMail size={14} className="text-gray-400" />
                <span>{customer.email}</span>
              </div>
            )}
          </div>
        </Link>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/${locale}/portal/siparisler/yeni?firmaId=${customer.id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 transition-colors"
          >
            <FiShoppingCart size={16} />
            {labels.createOrder}
          </Link>
        </div>
      </div>
    );
  }

  // Desktop Table Row
  return (
    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
      {/* Company Name */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/portal/musterilerim/${customer.id}`} className="hover:underline text-accent flex items-center gap-2">
            {customer.unvan}
            {customer.created_at && (Date.now() - new Date(customer.created_at).getTime() < 1000 * 60 * 60 * 48) && (
              <span className="animate-pulse bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">YENİ</span>
            )}
          </Link>
          {/* Quick Access Icons */}
          <div className="flex gap-1 ml-2">
            {customer.instagram_url && (
              <a href={customer.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-700">
                <FaInstagram size={14} />
              </a>
            )}
            {customer.google_maps_url && (
              <a href={customer.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                <FiMapPin size={14} />
              </a>
            )}
          </div>
        </div>
      </td>
      
      {/* Priority */}
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {customer.oncelik_puani !== undefined && customer.oncelik_puani !== null ? (
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs ${
              customer.oncelik_puani >= 80 ? 'bg-red-100 text-red-800 ring-1 ring-red-400' :
              customer.oncelik_puani >= 50 ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {customer.oncelik_puani >= 80 ? 'A' : customer.oncelik_puani >= 50 ? 'B' : 'C'}
              <span className="ml-1 text-[10px] opacity-75 font-normal">
                ({customer.oncelik_puani})
              </span>
            </span>
            
            {/* Compact Tags Display */}
            {(customer.etiketler && customer.etiketler.length > 0) && (
              <div className="flex flex-wrap justify-center gap-0.5 max-w-[100px]">
                {(customer.etiketler || []).map((tag: string) => {
                  const cleanTag = tag.replace('#', '').replace(/_/g, ' ');
                  const initials = cleanTag.split(' ').map((word: string) => word[0]).join('').toUpperCase();
                  return (
                    <span 
                      key={tag} 
                      className="px-1 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-200 text-[9px] font-mono cursor-help hover:bg-slate-100 hover:text-slate-800 transition-colors" 
                      title={cleanTag}
                    >
                      {initials}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          customer.oncelik ? (
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
              customer.oncelik === 'A' ? 'bg-red-100 text-red-800 ring-2 ring-red-400' :
              customer.oncelik === 'B' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {customer.oncelik}
            </span>
          ) : <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      
      {/* Source */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {customer.kaynak ? (
          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
            customer.kaynak.toLowerCase() === 'web' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            customer.kaynak.toLowerCase().includes('instagram') ? 'bg-pink-50 text-pink-700 border-pink-200' :
            customer.kaynak.toLowerCase().includes('google') ? 'bg-green-50 text-green-700 border-green-200' :
            customer.kaynak.toLowerCase().includes('saha') ? 'bg-orange-50 text-orange-700 border-orange-200' :
            customer.kaynak.toLowerCase().includes('referans') ? 'bg-purple-50 text-purple-700 border-purple-200' :
            'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
            {customer.kaynak.toUpperCase()}
          </span>
        ) : <span className="text-gray-400 text-[10px]">-</span>}
      </td>
      
      {/* Registration Date */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {customer.created_at ? new Date(customer.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
      </td>
      
      {/* Category */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
        {customer.kategori ? (
          <span className={`${KATEGORI_RENKLERI[customer.kategori] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded-full text-xs font-semibold`}>
            {customer.kategori}
          </span>
        ) : '-'}
      </td>
      
      {/* Phone */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{customer.telefon || '-'}</td>
      
      {/* Last Interaction */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {customer.son_etkilesim_tarihi ? (
          <span className="text-gray-700">
            {new Date(customer.son_etkilesim_tarihi).toLocaleDateString(locale === 'de' ? 'de-DE' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        ) : <span className="text-gray-400">-</span>}
      </td>
      
      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${statusColors[customer.status || ''] || 'bg-gray-100 text-gray-800'}`}>
          {customer.status || '-'}
        </span>
      </td>
    </tr>
  );
}
