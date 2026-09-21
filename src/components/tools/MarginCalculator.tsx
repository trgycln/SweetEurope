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
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{dict.title}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.syrupPrice} (€)</label>
            <input type="number" value={syrupPrice} onChange={(e) => setSyrupPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{dict.bottleVolume} (ml)</label>
              <input type="number" value={bottleVolume} onChange={(e) => setBottleVolume(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{dict.usagePerDrink} (ml)</label>
              <input type="number" value={usagePerDrink} onChange={(e) => setUsagePerDrink(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.otherCosts} (€)</label>
            <input type="number" value={otherCosts} onChange={(e) => setOtherCosts(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{dict.sellingPrice} (€)</label>
            <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>

        {/* Results Dashboard */}
        <div className="bg-gray-50 p-6 rounded-xl flex flex-col justify-center space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-600 font-medium">{dict.costPerDrink}</span>
            <span className="text-2xl font-bold text-red-500">€{results.totalCost}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <span className="text-gray-600 font-medium">{dict.profitPerDrink}</span>
            <span className="text-3xl font-bold text-green-600">€{results.profit}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">{dict.profitMargin}</span>
            <span className="text-3xl font-bold text-primary">{results.margin}%</span>
          </div>
          
          {/* Visual Bar */}
          <div className="w-full h-4 bg-red-100 rounded-full overflow-hidden flex mt-4">
            <div style={{ width: `${100 - Number(results.margin)}%` }} className="bg-red-500 h-full"></div>
            <div style={{ width: `${results.margin}%` }} className="bg-green-500 h-full"></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Cost</span>
            <span>Profit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
