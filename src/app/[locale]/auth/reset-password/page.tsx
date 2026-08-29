'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FiKey, FiLoader, FiMail } from 'react-icons/fi';

import { createDynamicSupabaseClient } from '@/lib/supabase/client';

const TEXTS: Record<string, {
  titleUpdate: string;
  titleRequest: string;
  descUpdate: string;
  descRequest: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendLinkBtn: string;
  newPassLabel: string;
  newPassPlaceholder: string;
  confirmPassLabel: string;
  confirmPassPlaceholder: string;
  savePassBtn: string;
  minCharsError: string;
  matchError: string;
  requestSuccess: string;
  updateSuccess: string;
  backToLogin: string;
  sending: string;
  saving: string;
}> = {
  de: {
    titleUpdate: 'Passwort festlegen',
    titleRequest: 'Passwort zurücksetzen',
    descUpdate: 'Legen Sie bitte Ihr persönliches Passwort für das B2B-Kundenportal fest.',
    descRequest: 'Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten.',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'beispiel@firma.de',
    sendLinkBtn: 'Link anfordern',
    newPassLabel: 'Neues Passwort',
    newPassPlaceholder: 'Mindestens 6 Zeichen',
    confirmPassLabel: 'Passwort bestätigen',
    confirmPassPlaceholder: 'Passwort wiederholen',
    savePassBtn: 'Neues Passwort speichern',
    minCharsError: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    matchError: 'Die Passwörter stimmen nicht überein.',
    requestSuccess: 'Ein Link zum Zurücksetzen wurde an Ihre E-Mail-Adresse gesendet.',
    updateSuccess: 'Ihr Passwort wurde erfolgreich gespeichert. Sie können sich jetzt einloggen.',
    backToLogin: 'Zurück zur Anmeldung',
    sending: 'Wird gesendet...',
    saving: 'Wird gespeichert...',
  },
  tr: {
    titleUpdate: 'Şifreyi Belirle',
    titleRequest: 'Şifre Sıfırlama',
    descUpdate: 'Davet veya kurtarma bağlantısı ile geldiniz. Yeni şifrenizi belirleyin.',
    descRequest: 'E-posta adresinizi girin, size şifre yenileme bağlantısı gönderelim.',
    emailLabel: 'E-posta',
    emailPlaceholder: 'ornek@firma.com',
    sendLinkBtn: 'Bağlantı Gönder',
    newPassLabel: 'Yeni Şifre',
    newPassPlaceholder: 'En az 6 karakter',
    confirmPassLabel: 'Şifre Tekrar',
    confirmPassPlaceholder: 'Şifreyi tekrar yazın',
    savePassBtn: 'Yeni Şifreyi Kaydet',
    minCharsError: 'Şifre en az 6 karakter olmalıdır.',
    matchError: 'Şifreler birbiriyle eşleşmiyor.',
    requestSuccess: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    updateSuccess: 'Şifreniz başarıyla güncellendi. Giriş sayfasına dönebilirsiniz.',
    backToLogin: 'Giriş sayfasına dön',
    sending: 'Gönderiliyor...',
    saving: 'Kaydediliyor...',
  },
  en: {
    titleUpdate: 'Set Password',
    titleRequest: 'Reset Password',
    descUpdate: 'Please set your new password for the B2B Customer Portal.',
    descRequest: 'Enter your email address to receive a password reset link.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'example@company.com',
    sendLinkBtn: 'Send Reset Link',
    newPassLabel: 'New Password',
    newPassPlaceholder: 'Minimum 6 characters',
    confirmPassLabel: 'Confirm Password',
    confirmPassPlaceholder: 'Repeat your password',
    savePassBtn: 'Save New Password',
    minCharsError: 'Password must be at least 6 characters long.',
    matchError: 'Passwords do not match.',
    requestSuccess: 'A password reset link has been sent to your email address.',
    updateSuccess: 'Your password has been successfully updated. You can now log in.',
    backToLogin: 'Back to Login',
    sending: 'Sending...',
    saving: 'Saving...',
  },
};

export default function ResetPasswordPage() {
  const params = useParams<{ locale: string }>();
  const locale = typeof params?.locale === 'string' && TEXTS[params.locale] ? params.locale : 'de';
  const t = TEXTS[locale] || TEXTS.de;

  const supabase = useMemo(() => createDynamicSupabaseClient(true), []);

  const [mode, setMode] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get('code');

      if (code) {
        try {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeErr) {
            setMode('update');
            return;
          }
        } catch (e) {
          console.warn('exchangeCodeForSession error:', e);
        }
      }

      const token_hash = searchParams.get('token_hash') || searchParams.get('token');
      const otpType = (searchParams.get('type') || 'recovery') as any;

      if (token_hash) {
        try {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash,
            type: otpType,
          });
          if (!otpErr) {
            setMode('update');
            return;
          } else {
            console.warn('verifyOtp error:', otpErr.message);
          }
        } catch (e) {
          console.warn('verifyOtp exception:', e);
        }
      }

      if (
        hash.includes('type=recovery') ||
        hash.includes('type=invite') ||
        hash.includes('access_token=') ||
        search.includes('type=recovery')
      ) {
        setMode('update');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMode('update');
      }
    };

    checkAuthStatus();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setMode('update');
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

    setSuccess(t.requestSuccess);
    setLoading(false);
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError(t.minCharsError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.matchError);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(t.updateSuccess);
    setLoading(false);

    // Auto-redirect to portal after 2 seconds
    setTimeout(() => {
      window.location.href = `/${locale}/portal`;
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            {mode === 'update' ? t.titleUpdate : t.titleRequest}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {mode === 'update' ? t.descUpdate : t.descRequest}
          </p>
        </div>

        {mode === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-slate-700">
                {t.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all"
                placeholder={t.emailPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiMail />}
              {loading ? t.sending : t.sendLinkBtn}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-slate-700">
                {t.newPassLabel}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all"
                placeholder={t.newPassPlaceholder}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold text-slate-700">
                {t.confirmPassLabel}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-500 outline-none transition-all"
                placeholder={t.confirmPassPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {loading ? <FiLoader className="animate-spin" /> : <FiKey />}
              {loading ? t.saving : t.savePassBtn}
            </button>
          </form>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{success}</div>}

        <div className="mt-6 text-center">
          <Link href={`/${locale}/login`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-green-700 transition-colors">
            ← {t.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
