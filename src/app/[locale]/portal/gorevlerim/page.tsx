// src/app/[locale]/portal/gorevlerim/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { addMyTaskAction, toggleTaskAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function GorevlerimPage({ params }: { params: { locale: Locale } }) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

  const { data: tasks } = await supabase
    .from('gorevler')
    .select('id, baslik, son_tarih, tamamlandi')
    .eq('sahip_id', user.id)
    .order('son_tarih', { ascending: true });

  async function onAddTask(fd: FormData) {
    'use server';
    await addMyTaskAction(fd, params.locale);
  }

  async function onToggleTask(fd: FormData) {
    'use server';
    await toggleTaskAction(fd, params.locale);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold text-primary">Görevlerim</h1>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <h2 className="font-serif text-xl font-bold text-primary mb-3">Yeni Görev</h2>
        <form action={onAddTask} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="baslik" placeholder="Görev başlığı" className="border rounded-lg p-3 md:col-span-2" required />
          <input type="date" name="son_tarih" className="border rounded-lg p-3" />
          <div className="md:col-span-3 flex justify-end">
            <button className="px-4 py-2 bg-accent text-white rounded-lg font-bold">Ekle</button>
          </div>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow border border-gray-200 divide-y">
        {(tasks || []).map((t: any) => (
          <div key={t.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-primary">{t.baslik}</p>
              <p className="text-xs text-gray-500">Son tarih: {t.son_tarih ? new Date(t.son_tarih).toLocaleDateString('tr-TR') : '-'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${t.tamamlandi ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {t.tamamlandi ? 'Tamamlandı' : 'Açık'}
              </span>
              <form action={onToggleTask}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="tamamlandi" value={String(t.tamamlandi)} />
                <button className="px-3 py-1 text-xs rounded-lg border hover:bg-gray-50">
                  {t.tamamlandi ? 'Geri Al' : 'Tamamla'}
                </button>
              </form>
            </div>
          </div>
        ))}
        {(tasks || []).length === 0 && (
          <div className="p-6 text-center text-gray-500">Göreviniz bulunmuyor.</div>
        )}
      </div>
    </div>
  );
}
