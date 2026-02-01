// src/app/[locale]/admin/belgeleri-yonet/page.tsx

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { DocumentManagementClient } from './DocumentManagementClient';

interface DocumentPageProps {
    params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: DocumentPageProps) {
    const { locale } = await params;
    const dictionary = await getDictionary(locale as Locale);
    const title = dictionary.adminDashboard?.documentsPage?.title || 'Dokumentenverwaltung';
    
    return {
        title,
        description: dictionary.adminDashboard?.documentsPage?.description || 'Verwalten Sie Ihre Dokumente',
    };
}

export default async function DocumentManagementPage({ params }: DocumentPageProps) {
    const { locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect(`/${locale}/auth/login`);
    }

    const dictionary = await getDictionary(locale as Locale);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {dictionary.adminDashboard?.documentsPage?.title || 'Dokumentenverwaltung'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {dictionary.adminDashboard?.documentsPage?.description}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="py-6">
                <DocumentManagementClient
                    locale={locale}
                    dictionary={dictionary}
                />
            </div>
        </div>
    );
}
