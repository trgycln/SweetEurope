// src/app/login/page.tsx (SON VE DOĞRU HALİ)
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// DEĞİŞİKLİK 1: Hatanın kaynağı olan import'u düzeltiyoruz.
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { FiLoader } from 'react-icons/fi';
import { dictionary } from '@/dictionaries/de';

export default function LoginPage() {
    const searchParams = useSearchParams();
    const content = dictionary.loginPage;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'unauthorized') {
            setError(content.unauthorizedError || 'Bu sayfaya erişim yetkiniz yok.');
            setIsSubmitting(false);
        }
    }, [searchParams, content.unauthorizedError]);

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // DEĞİŞİKLİK 2: "Beni Hatırla" durumuna göre doğru Supabase istemcisini oluşturuyoruz.
        const supabase = createDynamicSupabaseClient(rememberMe);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(content.errorMessage);
            console.error("Giriş Hatası:", error.message);
            setIsSubmitting(false);
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="font-serif text-5xl font-bold text-primary">{content.title}</h1>
                    <p className="mt-2 text-text-main/80">{content.subtitle}</p>
                </div>
                <form onSubmit={handleSignIn} className="space-y-6 bg-white p-8 rounded-2xl shadow-lg">
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">{content.emailLabel}</label>
                        <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={content.emailPlaceholder} className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"/>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-text-main/80 mb-2">{content.passwordLabel}</label>
                        <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={content.passwordPlaceholder} className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"/>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"/>
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-text-main/80">{content.rememberMe}</label>
                        </div>
                        <div className="text-sm">
                            <Link href="/auth/forgot-password" className="font-medium text-accent hover:underline">{content.forgotPasswordLink}</Link>
                        </div>
                    </div>
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
                            <p className="font-bold">{content.errorTitle}</p>
                            <p>{error}</p>
                        </div>
                    )}
                    <div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center rounded-lg bg-accent py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-opacity-90 transition-all disabled:cursor-not-allowed disabled:bg-accent/50">
                            {isSubmitting && (<FiLoader className="animate-spin mr-2" />)}
                            {isSubmitting ? content.submittingButton : content.submitButton}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}