// src/app/admin/login/AdminLoginForm.tsx
'use client';

import { useState } from 'react';
import { adminSignIn } from './actions'; // Admin Server Action'ı buraya çağıracağız

export default function AdminLoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await adminSignIn(email, password);

        setLoading(false);

        if (result.success) {
            // Başarılı girişten sonra Admin paneline yönlendir
            window.location.href = '/admin/dashboard'; 
        } else {
            // Hata mesajını göster
            setError(result.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
                    {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
                {loading ? 'Giriş Yapılıyor...' : 'Yönetici Girişi'}
            </button>
        </form>
    );
}