'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiKey, FiLoader, FiMail } from 'react-icons/fi';

import { createDynamicSupabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr';
  const supabase = useMemo(() => createDynamicSupabaseClient(true), []);

  const [mode, setMode] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('type=recovery') || hash.includes('type=invite') || hash.includes('access_token=')) {
      setMode('update');
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
        if (currentHash.includes('type=recovery') || currentHash.includes('type=invite') || currentHash.includes('access_token=')) {
          setMode('update');
        }
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const redirectTo = `${window.location.origin}/${locale}/auth/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    setLoading(false);
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess('Şifreniz başarıyla güncellendi. Giriş sayfasına dönebilirsiniz.');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl font-bold text-primary">
            {mode === 'update' ? 'Şifreyi Belirle' : 'Şifre Sıfırlama'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'update'
              ? 'Davet veya kurtarma bağlantısı ile geldiniz. Yeni şifrenizi belirleyin.'
              : 'E-posta adresinizi girin, size şifre yenileme bağlantısı gönderelim.'}
          </p>
        </div>

        {mode === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="ornek@firma.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiMail />}
              {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
                Yeni Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="En az 6 karakter"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                Şifre Tekrar
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Şifreyi tekrar yazın"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiKey />}
              {loading ? 'Kaydediliyor...' : 'Yeni Şifreyi Kaydet'}
            </button>
          </form>
        )}

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="mt-6 text-center">
          <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
