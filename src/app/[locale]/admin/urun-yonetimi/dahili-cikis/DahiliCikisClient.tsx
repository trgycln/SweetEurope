'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FiBox, FiCheckCircle, FiAlertCircle, FiSearch, FiChevronDown, FiClock, FiFileText } from 'react-icons/fi';
import { dahiliStokCikisiYapAction, NedenKodu } from '@/app/actions/dahili-stok-actions';

interface Product {
  id: string;
  ad: any;
  stok_kodu: string;
  stok_miktari: number;
}

interface Company {
  id: string;
  unvan: string;
}

interface HistoryItem {
  id: string;
  miktar: number;
  neden_kodu: string;
  created_at: string;
  lexware_belge_no: string;
  aciklama: string;
  urunler: { ad: any; stok_kodu: string };
  firmalar: { unvan: string } | null;
}

interface Props {
  locale: string;
  products: Product[];
  companies: Company[];
  history: HistoryItem[];
}

export default function DahiliCikisClient({ locale, products, companies, history }: Props) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    urunId: '',
    miktar: 1,
    nedenKodu: '101_numune' as NedenKodu,
    firmaId: '',
    aciklama: '',
    isTest: false,
  });

  // Ürün arama (Filtreleme) State'i
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca menüyü kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(p => {
      const pName = typeof p.ad === 'object' ? (p.ad?.tr || p.ad?.de || '') : String(p.ad || '');
      return pName.toLowerCase().includes(lowerQ) || (p.stok_kodu && p.stok_kodu.toLowerCase().includes(lowerQ));
    });
  }, [products, searchQuery]);

  const selectedProduct = products.find(p => p.id === form.urunId);
  const selectedProductName = selectedProduct 
    ? (typeof selectedProduct.ad === 'object' ? (selectedProduct.ad.tr || selectedProduct.ad.de) : selectedProduct.ad) 
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.urunId) {
      setErrorMsg('Lütfen önce bir ürün seçin.');
      return;
    }
    if (form.miktar < 1) {
      setErrorMsg('Miktar en az 1 olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const result = await dahiliStokCikisiYapAction({
        urunId: form.urunId,
        miktar: form.miktar,
        nedenKodu: form.nedenKodu,
        firmaId: form.firmaId || undefined,
        aciklama: form.aciklama,
        isTest: form.isTest
      });

      if (result.success) {
        setSuccessMsg(`Başarılı! ${form.isTest ? '(TEST)' : ''} İrsaliye No: ${result.lexwareBelgeNo || '-'}`);
        setForm({ urunId: '', miktar: 1, nedenKodu: '101_numune', firmaId: '', aciklama: '', isTest: form.isTest });
        setSearchQuery('');
        setTimeout(() => { setSuccessMsg(''); router.refresh(); }, 4000);
      } else {
        setErrorMsg(result.error || 'Bilinmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      setErrorMsg('Sunucu ile iletişim kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const reasonCodeLabels: Record<string, string> = {
    '101_numune': 'Saha Numunesi (Werbekosten)',
    '102_ofis_tuketimi': 'Ofis İkramı (Betriebsbedarf)',
    '103_sahsi_kullanim': 'Özel Tüketim (Privatentnahme)',
    '104_fire': 'Fire / Bozuk (Verderb)',
    '105_diger': 'Diğer',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* SOL KOLON: YENİ ÇIKIŞ FORMU */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiBox className="text-slate-400" /> Yeni Stok Çıkışı Oluştur
            </h2>
          </div>

          <div className="p-6">
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <FiCheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">İşlem Tamamlandı</p>
                  <p className="text-sm mt-0.5">{successMsg}</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <FiAlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Hata Oluştu</p>
                  <p className="text-sm mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ÜRÜN SEÇİCİ (SMART COMBOBOX) */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ürün Seçimi <span className="text-rose-500">*</span>
                </label>
                
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setIsDropdownOpen(true)}
                >
                  <div className={`flex items-center justify-between w-full px-4 py-2.5 bg-white border ${form.urunId ? 'border-slate-300' : 'border-blue-300 ring-2 ring-blue-50'} rounded-xl shadow-sm transition-all group-hover:border-blue-400`}>
                    <span className={`truncate ${!form.urunId ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
                      {form.urunId ? (selectedProduct?.stok_kodu ? `[${selectedProduct.stok_kodu}] ${selectedProductName}` : selectedProductName) : "Ürün aramak için tıklayın..."}
                    </span>
                    <FiChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Açılır Menü */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ürün adı veya kodu yazın..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">Ürün bulunamadı.</div>
                      ) : (
                        filteredProducts.map(p => {
                          const pName = typeof p.ad === 'object' ? (p.ad.tr || p.ad.de) : p.ad;
                          const isSelected = p.id === form.urunId;
                          const isOutOfStock = p.stok_miktari <= 0;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setForm({ ...form, urunId: p.id });
                                setIsDropdownOpen(false);
                                setSearchQuery('');
                              }}
                              className={`flex items-center justify-between p-3 cursor-pointer rounded-lg mb-0.5 transition-colors ${
                                isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="truncate pr-4">
                                <span className="font-medium">{pName}</span>
                                {p.stok_kodu && <span className="ml-2 text-xs text-slate-400">[{p.stok_kodu}]</span>}
                              </div>
                              <div className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${isOutOfStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.stok_miktari} Adet
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Miktar */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Miktar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.miktar}
                    onChange={(e) => setForm({ ...form, miktar: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 focus:bg-white"
                    required
                  />
                </div>

                {/* Neden Kodu */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    İşlem Türü <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.nedenKodu}
                    onChange={(e) => setForm({ ...form, nedenKodu: e.target.value as NedenKodu })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 focus:bg-white text-sm"
                    required
                  >
                    <option value="101_numune">Numune (Werbung)</option>
                    <option value="102_ofis_tuketimi">Ofis (Betrieb)</option>
                    <option value="103_sahsi_kullanim">Şahsi (Privat)</option>
                    <option value="104_fire">Fire / Bozuk</option>
                  </select>
                </div>
              </div>

              {/* Firma Seçimi */}
              {form.nedenKodu === '101_numune' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Hangi Müşteriye Verildi? (Opsiyonel)
                  </label>
                  <select
                    value={form.firmaId}
                    onChange={(e) => setForm({ ...form, firmaId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white text-sm"
                  >
                    <option value="">-- Müşteri Yok / Yeni Potansiyel --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.unvan}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Not / Açıklama
                </label>
                <textarea
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 focus:bg-white resize-none text-sm"
                  placeholder="İrsaliyeye düşülecek not (Örn: Tadım etkinliği için)"
                />
              </div>

              {/* Test Modu Checkbox */}
              <label className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors group">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    checked={form.isTest}
                    onChange={(e) => setForm({ ...form, isTest: e.target.checked })}
                    className="w-5 h-5 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500 focus:ring-2 transition-all"
                  />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 group-hover:text-amber-700">Simülasyon Modu (Test)</p>
                  <p className="text-amber-700/80 mt-0.5 leading-relaxed">İşaretliyken stok düşülmez, veritabanına kaydedilmez. Sadece Lexware API üzerinden test belgesi üretilir.</p>
                </div>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm hover:shadow focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sistem İşliyor...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-5 h-5" />
                      <span>Stoğu Düş & Belge Oluştur</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* SAĞ KOLON: GEÇMİŞ İŞLEMLER */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden h-full flex flex-col">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FiClock className="text-slate-400" /> Son Çıkış Hareketleri
            </h2>
            <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">Son {history.length} kayıt</span>
          </div>

          <div className="p-0 overflow-y-auto max-h-[700px]">
            {history.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FiFileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Henüz hiçbir çıkış işlemi yapılmamış.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map((item) => {
                  const pName = typeof item.urunler.ad === 'object' ? (item.urunler.ad.tr || item.urunler.ad.de) : item.urunler.ad;
                  
                  // Neden koduna göre renk ve badge tasarımı
                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  if (item.neden_kodu === '101_numune') badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                  if (item.neden_kodu === '104_fire') badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                  if (item.neden_kodu === '102_ofis_tuketimi') badgeColor = "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div key={item.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${badgeColor}`}>
                              {reasonCodeLabels[item.neden_kodu] || 'Diğer'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium font-mono">
                              {new Date(item.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {pName}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {item.firmalar?.unvan && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-slate-700">Firma:</span> {item.firmalar.unvan}
                              </span>
                            )}
                            {item.lexware_belge_no && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-slate-700">Belge No:</span> 
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{item.lexware_belge_no}</span>
                              </span>
                            )}
                          </div>
                          {item.aciklama && (
                            <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{item.aciklama}"
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                            -{item.miktar}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Adet</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
