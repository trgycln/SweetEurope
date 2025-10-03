"use client";

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dictionary } from '@/dictionaries/de';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { approvePartner, rejectPartner } from './actions';

interface Application {
  id: number;
  created_at: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: string;
}

export default function ApplicationsPage() {
  const content = dictionary.adminDashboard.applicationsPage;
  const supabase = createClient();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentApp, setCurrentApp] = useState<Application | null>(null);
  const menuOpen = Boolean(anchorEl);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Başvurular çekilirken hata:', error);
    } else {
      setApplications(data as Application[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel('realtime applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_applications' }, 
        () => { fetchApplications(); }
      ).subscribe();
      
    fetchApplications();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchApplications]);
  
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, app: Application) => {
    setAnchorEl(event.currentTarget);
    setCurrentApp(app);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentApp(null);
  };

  const handleApprove = () => {
    if (!currentApp) return;
    startTransition(async () => {
      const result = await approvePartner(currentApp);
      if (!result.success) {
        alert(`Hata: ${result.message}`);
      }
    });
    handleMenuClose();
  };

  const handleReject = () => {
    if (!currentApp) return;
    startTransition(async () => {
      await rejectPartner(currentApp.id);
    });
    handleMenuClose();
  };

  return (
    <>
      <div className="bg-white p-8 rounded-lg shadow-lg h-full flex flex-col">
        <h1 className="font-serif text-4xl text-primary mb-6 flex-shrink-0">{content.title}</h1>
        
        <div className="flex-1 min-h-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto h-full">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b-2">
                  <th className="py-3 px-4 uppercase text-sm">{content.date}</th>
                  <th className="py-3 px-4 uppercase text-sm">{content.company}</th>
                  <th className="py-3 px-4 uppercase text-sm">{content.contact}</th>
                  <th className="py-3 px-4 uppercase text-sm">{content.email}</th>
                  <th className="py-3 px-4 uppercase text-sm">{content.status}</th>
                  <th className="py-3 px-4 uppercase text-sm text-right">{content.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8">Yükleniyor...</td></tr>
                ) : applications.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">{content.noApplications}</td></tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className={`border-b hover:bg-gray-50 ${app.status !== 'pending' ? 'bg-gray-50 text-gray-500' : ''}`}>
                      <td className="py-4 px-4">{new Date(app.created_at).toLocaleDateString('de-DE')}</td>
                      <td className="py-4 px-4 font-bold text-primary">{app.company_name}</td>
                      <td className="py-4 px-4">{app.contact_person}</td>
                      <td className="py-4 px-4"><a href={`mailto:${app.email}`} className="text-accent hover:underline">{app.email}</a></td>
                      <td className="py-4 px-4 capitalize font-medium">
                        {app.status === 'approved' ? <span className="text-green-600">{content.approved}</span> : app.status}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {app.status === 'pending' && (
                          <IconButton aria-label="eylemler" onClick={(e) => handleMenuClick(e, app)} disabled={isPending}>
                            <MoreVertIcon />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 overflow-y-auto">
            {loading ? <p>Yükleniyor...</p> : applications.length === 0 ? (
              <p className="text-center py-8 text-gray-500">{content.noApplications}</p>
            ) : (
              applications.map(app => (
                <div key={app.id} className="border rounded-lg p-4 space-y-3 shadow">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-primary text-lg">{app.company_name}</span>
                    <span className={`text-sm capitalize font-medium ${app.status === 'approved' ? 'text-green-600' : 'text-gray-600'}`}>{app.status === 'approved' ? content.approved : app.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 border-t pt-2">
                    <p>{app.contact_person}</p>
                    <p>{app.email}</p>
                    <p>{new Date(app.created_at).toLocaleDateString('de-DE')}</p>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex justify-end pt-2 border-t">
                      <IconButton aria-label="eylemler" onClick={(e) => handleMenuClick(e, app)} disabled={isPending}>
                        <MoreVertIcon />
                      </IconButton>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        <MenuItem onClick={handleApprove} disabled={isPending}>{content.approve}</MenuItem>
        <MenuItem onClick={handleReject} disabled={isPending}>{content.reject}</MenuItem>
      </Menu>
    </>
  );
}