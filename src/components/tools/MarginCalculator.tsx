'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, Percent } from 'lucide-react';

type Translations = {
  title: string;
  syrupPrice: string;
  bottleVolume: string;
  usagePerDrink: string;
  otherCosts: string;
  sellingPrice: string;
  costPerDrink: string;
  profitPerDrink: string;
  profitMargin: string;
  syrupCostLabel: string;
  profitMultiplier: string;
  profitMultiplierSub: string;
  marginSub: string;
  bottleProfit: string;
  bottleProfitSub: string;
  disclaimer: string;
};

export default function MarginCalculator({ dict }: { dict: Translations }) {
  const [syrupPrice, setSyrupPrice] = useState<number>(4.99); // Şişe fiyatı (Euro)
  const [bottleVolume, setBottleVolume] = useState<number>(700); // Şişe hacmi (ml)
  const [usagePerDrink, setUsagePerDrink] = useState<number>(20); // İçecek başı kullanım (ml)
  const [otherCosts, setOtherCosts] = useState<number>(0.80); // Diğer maliyetler (Kahve, süt vb.)
  const [sellingPrice, setSellingPrice] = useState<number>(5.50); // Satış fiyatı

  const results = useMemo(() => {
    const validVolume = bottleVolume > 0 ? bottleVolume : 1;
    const validUsage = usagePerDrink > 0 ? usagePerDrink : 1;
    const servings = Math.floor(validVolume / validUsage);

    const costPerMl = syrupPrice / validVolume;
    const syrupCostPerDrink = costPerMl * usagePerDrink;
    const totalCost = syrupCostPerDrink + otherCosts;
    const profit = Math.max(0, sellingPrice - totalCost);
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const multiplier = totalCost > 0 ? sellingPrice / totalCost : 0;
    const bottleProfitTotal = servings * profit;

    return {
      syrupCost: syrupCostPerDrink.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      margin: margin.toFixed(1),
      multiplier: multiplier.toFixed(1),
      servings,
      bottleProfit: bottleProfitTotal.toFixed(2),
    };
  }, [syrupPrice, bottleVolume, usagePerDrink, otherCosts, sellingPrice]);

  return (
    <div className="bg-primary p-6 md:p-8 rounded-2xl shadow-2xl border border-accent/20 max-w-4xl mx-auto text-secondary">
      <div className="mb-8 pb-6 border-b border-white/10">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">{dict.title}</h2>
        <p className="text-sm text-secondary/70 mt-1">
          {dict.syrupCostLabel}: <span className="text-accent font-semibold">€{results.syrupCost}</span> / porsiyon ({results.servings} {dict.bottleProfitSub})
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Kolon: Girdiler (5 Birim) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-secondary/70 mb-1.5">
                {dict.syrupPrice} (€)
              </label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={syrupPrice} 
                onChange={(e) => setSyrupPrice(Number(e.target.value))} 
                className="w-full px-3 py-2 bg-black/20 border border-accent/40 rounded-lg focus:border-accent text-white font-semibold outline-none transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-secondary/70 mb-1.5">
                  {dict.bottleVolume} (ml)
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={bottleVolume} 
                  onChange={(e) => setBottleVolume(Number(e.target.value))} 
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:border-accent text-white outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-secondary/70 mb-1.5">
                  {dict.usagePerDrink} (ml)
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={usagePerDrink} 
                  onChange={(e) => setUsagePerDrink(Number(e.target.value))} 
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:border-accent text-white outline-none transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-secondary/70 mb-1.5">
                {dict.otherCosts} (€)
              </label>
              <input 
                type="number" 
                step="0.05"
                min="0"
                value={otherCosts} 
                onChange={(e) => setOtherCosts(Number(e.target.value))} 
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg focus:border-accent text-white outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-accent mb-1.5">
                {dict.sellingPrice} (€)
              </label>
              <input 
                type="number" 
                step="0.10"
                min="0"
                value={sellingPrice} 
                onChange={(e) => setSellingPrice(Number(e.target.value))} 
                className="w-full px-3 py-2 bg-accent/10 border-2 border-accent rounded-lg focus:border-accent text-accent font-bold text-lg outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Sade ve Güçlü Sonuç Paneli (7 Birim) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Hızlı Özet Çubuğu */}
          <div className="grid grid-cols-3 gap-2 bg-black/30 p-3.5 rounded-xl border border-white/10 text-center">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-secondary/60">{dict.costPerDrink}</div>
              <div className="text-base md:text-lg font-semibold text-white mt-0.5">€{results.totalCost}</div>
            </div>
            <div className="border-x border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-secondary/60">{dict.sellingPrice}</div>
              <div className="text-base md:text-lg font-semibold text-white mt-0.5">€{sellingPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-accent">{dict.profitPerDrink}</div>
              <div className="text-base md:text-lg font-bold text-accent mt-0.5">€{results.profit}</div>
            </div>
          </div>

          {/* 3 Ana Kart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kart 1: Çarpan (Esnaf Dili) */}
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-accent/30 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary/80">
                  {dict.profitMultiplier}
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 tracking-tight my-1">
                {results.multiplier}x
              </div>
              <p className="text-xs text-secondary/70">
                {dict.profitMultiplierSub} ({Number(results.multiplier) > 1 ? `+${((Number(results.multiplier) - 1) * 100).toFixed(0)}%` : '0%'})
              </p>
            </div>

            {/* Kart 2: Kâr Marjı (Muhasebe Dili) */}
            <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary/80">
                  {dict.profitMargin}
                </span>
                <Percent className="w-4 h-4 text-accent" />
              </div>
              <div className="text-3xl font-extrabold text-accent tracking-tight my-1">
                %{results.margin}
              </div>
              <p className="text-xs text-secondary/70">
                {dict.marginSub}
              </p>
            </div>

            {/* Kart 3: 1 Şişeden Toplam Kâr (B2B Vuruşu - Tam Genişlik) */}
            <div className="sm:col-span-2 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-0.5">
                  {dict.bottleProfit}
                </div>
                <div className="text-xs text-secondary/70">
                  1 şişe ({results.servings} {dict.bottleProfitSub})
                </div>
              </div>
              <div className="text-3xl font-black text-white sm:text-right">
                €{results.bottleProfit}
              </div>
            </div>
          </div>

          {/* Dipnot / Disclaimer */}
          <p className="text-[11px] text-secondary/40 leading-relaxed italic border-t border-white/5 pt-3">
            {dict.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
