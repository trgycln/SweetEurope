// src/app/[locale]/admin/crm/firmalar/FirmaRow.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { FaInstagram } from 'react-icons/fa';
import { FiMapPin, FiPhone, FiUsers } from 'react-icons/fi';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';

interface FirmaRowProps {
  firma: any;
  locale: string;
  statusOptions: Record<string, string>;
  statusColors: Record<string, string>;
  F: any;
  isDesktop?: boolean;
}

export default function FirmaRow({ 
  firma, 
  locale, 
  statusOptions, 
  statusColors,
  F,
  isDesktop = false 
}: FirmaRowProps) {
  const { addCompany, removeCompany, isSelected } = useVisitPlanner();
  const selected = isSelected(firma.id);

  const handleCheckboxChange = () => {
    if (selected) {
      removeCompany(firma.id);
    } else {
      addCompany({
        id: firma.id,
        unvan: firma.unvan,
        adres: firma.adres,
        sehir: firma.sehir,
        ilce: firma.ilce,
        posta_kodu: firma.posta_kodu,
        google_maps_url: firma.google_maps_url,
        telefon: firma.telefon,
      });
    }
  };

  if (!isDesktop) {
    // Mobile Card View
    return (
      <div className={`bg-white rounded-lg shadow-lg p-5 border-l-4 transition-all ${
        selected ? 'border-green-500 ring-2 ring-green-200' : 'border-accent'
      } hover:shadow-xl hover:-translate-y-1`}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            className="mt-1 w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
            title="Ziyaret planına ekle"
          />
          
          <Link href={`/${locale}/admin/crm/firmalar/${firma.id}`} className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl font-bold text-primary">{firma.unvan}</h3>
                <p className="text-sm text-gray-500">{firma.kategori || '-'}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[firma.status as string] || 'bg-gray-100 text-gray-800'}`}>
                {firma.status ? (statusOptions?.[firma.status as keyof typeof statusOptions] || firma.status) : F.unknown}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <FiPhone size={14} className="text-gray-400" />
                <span>{firma.telefon || F.noPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FiUsers size={14} className="text-gray-400" />
                <span>{F.responsiblePerson}{firma.sorumlu_personel?.tam_ad || F.notAssigned}</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Desktop Table Row
  return (
    <tr className={`transition-colors duration-150 ${
      selected ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-gray-50/50'
    }`}>
      {/* Checkbox Column */}
      <td className="px-4 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={handleCheckboxChange}
          className="w-5 h-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
          title="Ziyaret planına ekle"
        />
      </td>
      
      {/* Company Name */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/admin/crm/firmalar/${firma.id}`} className="hover:underline text-accent flex items-center gap-2">
            {firma.unvan}
            {firma.created_at && (Date.now() - new Date(firma.created_at).getTime() < 1000 * 60 * 60 * 48) && (
              <span className="animate-pulse bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">YENİ</span>
            )}
          </Link>
          {/* Quick Access Icons */}
          <div className="flex gap-1 ml-2">
            {firma.instagram_url && (
              <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-700">
                <FaInstagram size={14} />
              </a>
            )}
            {firma.google_maps_url && (
              <a href={firma.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                <FiMapPin size={14} />
              </a>
            )}
          </div>
        </div>
      </td>
      
      {/* Priority */}
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {firma.oncelik_puani !== undefined ? (
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs ${
              firma.oncelik_puani >= 80 ? 'bg-red-100 text-red-800 ring-1 ring-red-400' :
              firma.oncelik_puani >= 50 ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {firma.oncelik_puani >= 80 ? 'A' : firma.oncelik_puani >= 50 ? 'B' : 'C'}
              <span className="ml-1 text-[10px] opacity-75 font-normal">
                ({firma.oncelik_puani})
              </span>
            </span>
            
            {/* Compact Tags Display */}
            {(firma.etiketler && firma.etiketler.length > 0) && (
              <div className="flex flex-wrap justify-center gap-0.5 max-w-[100px]">
                {(firma.etiketler || []).map((tag: string) => {
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
          firma.oncelik ? (
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
              firma.oncelik === 'A' ? 'bg-red-100 text-red-800 ring-2 ring-red-400' :
              firma.oncelik === 'B' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {firma.oncelik}
            </span>
          ) : <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      
      {/* Source */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {firma.kaynak ? (
          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
            firma.kaynak.toLowerCase() === 'web' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            firma.kaynak.toLowerCase().includes('instagram') ? 'bg-pink-50 text-pink-700 border-pink-200' :
            firma.kaynak.toLowerCase().includes('google') ? 'bg-green-50 text-green-700 border-green-200' :
            firma.kaynak.toLowerCase().includes('saha') ? 'bg-orange-50 text-orange-700 border-orange-200' :
            firma.kaynak.toLowerCase().includes('referans') ? 'bg-purple-50 text-purple-700 border-purple-200' :
            'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
            {firma.kaynak.toUpperCase()}
          </span>
        ) : <span className="text-gray-400 text-[10px]">-</span>}
      </td>
      
      {/* Registration Date */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {firma.created_at ? new Date(firma.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
      </td>
      
      {/* Category */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.kategori || '-'}</td>
      
      {/* Phone */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.telefon || '-'}</td>
      
      {/* Last Interaction */}
      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-main">
        {firma.son_etkilesim_tarihi ? (
          <span className="text-gray-700">
            {new Date(firma.son_etkilesim_tarihi).toLocaleDateString(locale === 'de' ? 'de-DE' : 'tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        ) : <span className="text-gray-400">-</span>}
      </td>
      
      {/* Responsible */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.sorumlu_personel?.tam_ad || F.notAssigned}</td>
      
      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${statusColors[firma.status as string] || 'bg-gray-100 text-gray-800'}`}>
          {firma.status ? (statusOptions?.[firma.status as keyof typeof statusOptions] || firma.status) : F.unknown}
        </span>
      </td>
    </tr>
  );
}
