// src/app/admin/dashboard/AdminStatCard.tsx (KORRIGIERT)
"use client"; 

import React from 'react';

// KEIN import { IconType } from 'react-icons'; mehr nötig

interface AdminStatCardProps {
    title: string;
    value: string;
    // ÄNDERUNG: Erwarte ein React-Element (das Icon) statt des Icon-Typs
    icon: React.ReactNode; 
    description: string;
    color: string;
}

// Hier empfangen wir das Icon direkt als gerendertes Element
export function AdminStatCard({ title, value, icon, description, color }: AdminStatCardProps) {
    return (
        <div className={`p-6 rounded-lg shadow-md ${color} flex flex-col justify-between h-40`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-semibold uppercase opacity-80">{title}</h3>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                {/* Das Icon-Element wird hier direkt gerendert */}
                <div className="text-4xl opacity-50">
                    {icon} 
                </div>
            </div>
            <p className="text-xs mt-2 opacity-70">{description}</p>
        </div>
    );
}