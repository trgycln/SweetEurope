import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-5 pb-10 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="h-7 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-4 w-32 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-10 w-64 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 h-24">
            <div className="h-6 w-20 bg-slate-200 rounded-md mb-3"></div>
            <div className="h-3 w-16 bg-slate-100 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Nakit & Sermaye Skeleton */}
      <div>
        <div className="h-3 w-32 bg-slate-200 rounded-md mb-3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 h-28">
              <div className="h-3 w-24 bg-slate-100 rounded-md mb-4"></div>
              <div className="h-8 w-32 bg-slate-200 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Hızlı İşlemler Skeleton */}
      <div className="bg-white rounded-xl border border-slate-100 px-5 py-4">
        <div className="h-3 w-24 bg-slate-200 rounded-md mb-4"></div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>

      {/* Büyük Seksiyon Skeleton */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 h-96">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
          <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-slate-50 rounded-xl"></div>
          <div className="h-64 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
