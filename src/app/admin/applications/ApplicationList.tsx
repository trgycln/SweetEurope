// src/app/admin/applications/ApplicationList.tsx
'use client';

import React, { useState } from 'react';
// SADECE kullanılan Server Actions'lar import edildi (getPendingApplications ve redirect kaldırıldı)
import { approvePartner, rejectPartner } from './actions'; 

interface Application {
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    created_at: string;
    // 'Anlaşıldı' status'ünü desteklemek için bu tipi genişletmeyi düşünebilirsiniz,
    // ancak Client Component'te sadece listeleme yapıldığı için şimdilik varsayılanlar kalabilir.
    status: 'pending' | 'approved' | 'rejected' | string; 
}

interface ApplicationListProps {
    applications: Application[];
    dictionary: any; 
}

export default function ApplicationList({ applications: initialApplications, dictionary }: ApplicationListProps) {
    const [applications, setApplications] = useState(initialApplications);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setLoadingId(id);
        
        let result;
        if (action === 'approve') {
            // approvePartner çağrısı doğru
            result = await approvePartner(id); 
        } else {
            // rejectPartner çağrısı doğru
            result = await rejectPartner(id); 
        }

        setLoadingId(null);
        
        if (result.success) {
            // Başarılı olursa, listeden kaldır
            setApplications(prev => prev.filter(app => app.id !== id));
        } else {
            alert(dictionary.actionError + result.message);
        }
    };

    return (
        <div className="space-y-4">
            {/* Eğer applications boşsa, uyarı göster */}
            {applications.length === 0 && (
                <div className="p-4 text-center text-gray-500 border rounded-lg">
                    {dictionary.noApplicationsFound || "Aktif Başvuru bulunmamaktadır."}
                </div>
            )}

            {applications.map((app) => (
                <div key={app.id} className="border p-4 rounded-lg flex justify-between items-center transition duration-300 hover:shadow-md">
                    <div>
                        <p className="text-lg font-semibold">{app.company_name} <span className="text-sm font-normal text-gray-500">({app.contact_person})</span></p>
                        <p className="text-sm text-gray-600">Email: {app.email}</p>
                        <p className="text-sm text-gray-600">Telefon: {app.phone || dictionary.noPhone}</p>
                        <p className="text-xs text-gray-400">Başvuru Tarihi: {new Date(app.created_at).toLocaleDateString()}</p>
                        {/* Partneranträge sayfasının artık 'Anlaşıldı' olanları çektiğini varsayarak,
                            bu satırda bir durum etiketi gösterebilirsiniz */}
                        <p className={`text-xs mt-1 font-bold ${app.status === 'Anlaşıldı' ? 'text-blue-600' : 'text-orange-600'}`}>
                            Durum: {app.status}
                        </p>
                    </div>
                    
                    <div className="space-x-2 flex items-center">
                        <button
                            onClick={() => handleAction(app.id, 'approve')}
                            disabled={loadingId === app.id}
                            className={`px-4 py-2 rounded text-white font-medium ${
                                loadingId === app.id ? 'bg-blue-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {loadingId === app.id ? dictionary.loading : dictionary.approve}
                        </button>
                        
                        <button
                            onClick={() => handleAction(app.id, 'reject')}
                            disabled={loadingId === app.id}
                            className={`px-4 py-2 rounded text-white font-medium ${
                                loadingId === app.id ? 'bg-blue-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {dictionary.reject}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}