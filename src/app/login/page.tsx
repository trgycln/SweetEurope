'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FiLoader } from 'react-icons/fi';
// DÜZELTME: Wörterbuch importiert
import { dictionary } from '@/dictionaries/de'; 

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  // DÜZELTME: Textinhalte aus dem Wörterbuch geholt
  const content = dictionary.loginPage;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/admin/dashboard'); 
      router.refresh();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          {/* DÜZELTME: Texte aus 'content' verwendet */}
          <h1 className="font-serif text-5xl font-bold text-primary">{content.title}</h1>
          <p className="mt-2 text-text-main/80">{content.subtitle}</p>
        </div>
        <form onSubmit={handleSignIn} className="space-y-6 bg-white p-8 rounded-2xl shadow-lg">
          
          <div>
            {/* DÜZELTME: Texte aus 'content' verwendet */}
            <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">{content.emailLabel}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={content.emailPlaceholder}
              className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            {/* DÜZELTME: Texte aus 'content' verwendet */}
            <label htmlFor="password" className="block text-sm font-bold text-text-main/80 mb-2">{content.passwordLabel}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={content.passwordPlaceholder}
              className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
              {/* DÜZELTME: Texte aus 'content' verwendet */}
              <p className="font-bold">{content.errorTitle}</p>
              <p>{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center rounded-lg bg-accent py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-opacity-90 transition-all disabled:cursor-not-allowed disabled:bg-accent/50"
            >
              {isSubmitting && (
                <FiLoader className="animate-spin mr-2" />
              )}
              {/* DÜZELTME: Texte aus 'content' verwendet */}
              {isSubmitting ? content.submittingButton : content.submitButton}
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm">
          {/* DÜZELTME: Texte aus 'content' verwendet */}
          <Link href="/auth/forgot-password" className="font-medium text-accent hover:underline">
            {content.forgotPasswordLink}
          </Link>
        </div>
        
      </div>
    </div>
  );
}