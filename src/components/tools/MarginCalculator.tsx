'use client';

import { useState, useMemo } from 'react';

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
};

export default function MarginCalculator({ dict }: { dict: Translations }) {
  const [syrupPrice, setSyrupPrice] = useState<number>(12.50); // Şişe fiyatı (Euro)
  const [bottleVolume, setBottleVolume] = useState<number>(700); // Şişe hacmi (ml)
  const [usagePerDrink, setUsagePerDrink] = useState<number>(20); // İçecek başı kullanım (ml)
  const [otherCosts, setOtherCosts] = useState<number>(0.80); // Diğer maliyetler (Kahve, süt vb.)
  const [sellingPrice, setSellingPrice] = useState<number>(5.50); // Satış fiyatı

  const results = useMemo(() => {
    const costPerMl = syrupPrice / bottleVolume;
    const syrupCostPerDrink = costPerMl * usagePerDrink;
    const totalCost = syrupCostPerDrink + otherCosts;
    const profit = sellingPrice - totalCost;
    const margin = (profit / sellingPrice) * 100;

    return {
      syrupCost: syrupCostPerDrink.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      margin: margin.toFixed(1),
    };
  }, [syrupPrice, bottleVolume, usagePerDrink, otherCosts, sellingPrice]);

  return (
    <div className="bg-primary p-6 md:p-8 rounded-2xl shadow-2xl border border-accent/20 max-w-4xl mx-auto text-secondary">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-8 text-center md:text-left">{dict.title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1">{dict.syrupPrice} (€)</label>
            <input type="number" value={syrupPrice} onChange={(e) => setSyrupPrice(Number(e.target.value))} className="w-full py-2 bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1">{dict.bottleVolume} (ml)</label>
              <input type="number" value={bottleVolume} onChange={(e) => setBottleVolume(Number(e.target.value))} className="w-full py-2 bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1">{dict.usagePerDrink} (ml)</label>
              <input type="number" value={usagePerDrink} onChange={(e) => setUsagePerDrink(Number(e.target.value))} className="w-full py-2 bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1">{dict.otherCosts} (€)</label>
            <input type="number" value={otherCosts} onChange={(e) => setOtherCosts(Number(e.target.value))} className="w-full py-2 bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1">{dict.sellingPrice} (€)</label>
            <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="w-full py-2 bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none transition-colors font-bold text-accent" />
          </div>
        </div>

        {/* Results Dashboard */}
        <div className="bg-primary border border-accent/20 p-8 rounded-xl flex flex-col justify-center space-y-8">
          <div className="flex justify-between items-center border-b border-accent/20 pb-4">
            <span className="text-secondary/70 font-medium text-lg">{dict.costPerDrink}</span>
            <span className="text-2xl font-bold text-secondary">€{results.totalCost}</span>
          </div>
          <div className="flex justify-between items-center border-b border-accent/20 pb-4">
            <span className="text-secondary/70 font-medium text-lg">{dict.profitPerDrink}</span>
            <span className="text-3xl font-bold text-accent">€{results.profit}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-secondary/70 font-medium text-lg">{dict.profitMargin}</span>
            <span className="text-4xl font-bold text-accent drop-shadow-sm">{results.margin}%</span>
          </div>
          
          {/* Visual Bar */}
          <div className="w-full h-4 bg-secondary/10 rounded-full overflow-hidden flex mt-2 border border-accent/20">
            <div style={{ width: `${100 - Number(results.margin)}%` }} className="bg-secondary/40 h-full transition-all duration-500"></div>
            <div style={{ width: `${results.margin}%` }} className="bg-accent h-full transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
          </div>
          <div className="flex justify-between text-xs text-secondary/50 mt-1 uppercase tracking-wider font-bold">
            <span>Cost</span>
            <span>Profit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
