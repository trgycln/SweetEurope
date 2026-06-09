'use client';

import React, { useState } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';

interface PlzRegionModalProps {
    onClose: () => void;
}

export default function PlzRegionModal({ onClose }: PlzRegionModalProps) {
    const [search, setSearch] = useState('');

    const plzEntries = Object.entries(KOLN_PLZ_MAP).map(([plz, data]) => ({
        plz,
        district: data.district,
        cityPart: data.cityPart || '',
    }));

    const filteredEntries = plzEntries.filter(e => 
        e.plz.includes(search) || 
        e.district.toLowerCase().includes(search.toLowerCase()) ||
        e.cityPart.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Köln PLZ ve Bölge Rehberi</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Haritadan bir bölge seçin veya arama yapın.</p>
                    </div>
                    <button type="button" onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Map & Search Container */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                    
                    {/* Schematic Map */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="text-center mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Şematik Bölge Haritası</span>
                        </div>
                        
                        {/* Rhine River representation */}
                        <div className="absolute top-0 bottom-0 left-[60%] w-3 bg-blue-100 skew-x-[-15deg] z-0 opacity-70"></div>
                        
                        <div className="relative z-10 grid grid-cols-3 gap-2 max-w-sm mx-auto">
                            {/* Left side (Linksrheinisch) - mostly col 1 & 2 */}
                            <div className="col-span-1"></div>
                            <button onClick={() => setSearch('Chorweiler')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'chorweiler' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>6. Chorweiler</button>
                            <div className="col-span-1 row-span-4 flex items-center justify-center pl-4">
                                {/* Right side (Rechtsrheinisch) - col 3 */}
                                <div className="flex flex-col gap-2 w-full">
                                    <button onClick={() => setSearch('Mülheim')} className={`p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'mülheim' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>9. Mülheim</button>
                                    <button onClick={() => setSearch('Kalk')} className={`p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'kalk' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>8. Kalk</button>
                                    <button onClick={() => setSearch('Porz')} className={`p-1.5 text-[10px] font-bold rounded border transition-colors h-12 ${search.toLowerCase() === 'porz' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>7. Porz</button>
                                </div>
                            </div>
                            
                            <button onClick={() => setSearch('Ehrenfeld')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'ehrenfeld' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>4. Ehrenfeld</button>
                            <button onClick={() => setSearch('Nippes')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'nippes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>5. Nippes</button>
                            
                            <button onClick={() => setSearch('Lindenthal')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'lindenthal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>3. Lindenthal</button>
                            <button onClick={() => setSearch('Innenstadt')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'innenstadt' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'}`}>1. Innenstadt</button>
                            
                            <div className="col-span-1"></div>
                            <button onClick={() => setSearch('Rodenkirchen')} className={`col-span-1 p-1.5 text-[10px] font-bold rounded border transition-colors ${search.toLowerCase() === 'rodenkirchen' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'}`}>2. Rodenkirchen</button>
                        </div>
                    </div>

                    <div className="relative w-full max-w-full flex items-center gap-2">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="PLZ veya Semt adı (örn: 50667, Ehrenfeld)..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm" />
                        </div>
                        {search && (
                            <button onClick={() => setSearch('')} className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                                Temizle
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-y-auto flex-1">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 border-b border-slate-200">PLZ</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 border-b border-slate-200">Bölge (Stadtbezirk)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 border-b border-slate-200">Semt (Stadtteil)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEntries.map(e => (
                                <tr key={e.plz} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-sm font-mono text-slate-700 font-semibold">{e.plz}</td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{e.cityPart}</td>
                                    <td className="px-6 py-3 text-sm text-slate-600">{e.district}</td>
                                </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                                        Eşleşen sonuç bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
