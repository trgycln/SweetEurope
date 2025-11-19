// src/app/[locale]/portal/musterilerim/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { addMyCustomerAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function MusterilerimPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

  const { data: firms, error } = await supabase
    .from('firmalar')
    .select('*')
    .eq('sahip_id', user.id)
    .order('unvan', { ascending: true });

  if (error) {
    console.error('Müşteriler çekilirken hata:', error);
  }

  // Server Action wrapper for adding a customer
  async function createCustomer(formData: FormData) {
    'use server';
    await addMyCustomerAction(formData, locale);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Müşterilerim</h1>
          <p className="text-sm text-gray-600">Kayıtlı müşterileriniz</p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h2 className="font-serif text-xl font-bold text-primary mb-4">Yeni Müşteri Ekle</h2>
        <form action={createCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="unvan" placeholder="Firma" className="border rounded-lg p-3" required />
          <input name="telefon" placeholder="Telefon" className="border rounded-lg p-3" />
          <input name="email" type="email" placeholder="E-posta" className="border rounded-lg p-3" />
          <input name="adres" placeholder="Adres" className="border rounded-lg p-3 md:col-span-2" />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:bg-opacity-90">Ekle</button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Firma</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">E-posta</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(firms || []).map((f: any) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">{f.unvan}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{f.telefon || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{f.email || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <a href={`/${locale}/portal/musterilerim/${f.id}`} className="text-accent font-bold hover:underline">Detaya Git</a>
                </td>
              </tr>
            ))}
            {(firms || []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Kayıtlı müşteriniz bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
