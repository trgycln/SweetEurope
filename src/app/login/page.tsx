// src/app/login/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

// Supabase Client'ını kullanarak giriş işlemini Server Action yerine Client tarafında yapıyoruz.
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Hataları temizle

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            // Hata olursa kullanıcıya göster
            setError(signInError.message || 'Giriş yapılırken bir hata oluştu.');
            return;
        }

        // Başarılı girişten sonra Admin Dashboard'a yönlendir.
        router.push('/admin/dashboard');
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold text-center text-gray-900">
                    Partner Portal Girişi
                </h2>
                {error && (
                    <div className="p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg">
                        {error}
                    </div>
                )}
                <form className="space-y-6" onSubmit={handleSignIn}>
                    <div>
                        <label 
                            htmlFor="email" 
                            className="block text-sm font-medium text-gray-700"
                        >
                            E-posta Adresi
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label 
                            htmlFor="password" 
                            className="block text-sm font-medium text-gray-700"
                        >
                            Şifre
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Giriş Yap
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Ana Sayfaya Geri Dön
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;