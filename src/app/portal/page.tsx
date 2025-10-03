"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { dictionary } from '@/dictionaries/de';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation'; // Yönlendirme için useRouter'ı import ettik

export default function PortalLoginPage() {
  const content = dictionary.portalLoginPage;
  const router = useRouter(); // Yönlendiriciyi tanımladık
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('E-Mail oder Passwort ist ungültig.');
    } else {
      // Başarılı girişten sonra /dashboard sayfasına yönlendiriyoruz
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-6">
      <div className="container mx-auto max-w-4xl grid md:grid-cols-2 shadow-2xl rounded-lg overflow-hidden">
        
        {/* Sol Sütun: Görsel ve Karşılama Mesajı */}
        <div className="relative hidden md:block">
          <Image 
            src="/portal-login-bg.png"
            alt="Professionelle Patisserie-Zubereitung"
            layout="fill"
            objectFit="cover"
            priority
          />
          <div className="absolute inset-0 bg-primary bg-opacity-70 flex flex-col justify-end p-8">
            <h2 className="font-serif text-3xl font-bold mb-4 text-secondary drop-shadow-xl">{content.welcomeTitle}</h2>
            <p className="font-sans leading-relaxed text-secondary/90 drop-shadow-xl">{content.welcomeText}</p>
          </div>
        </div>

        {/* Sağ Sütun: Giriş Formu */}
        <div className="bg-white p-8 md:p-12 flex flex-col justify-center">
          <h1 className="font-serif text-3xl font-bold text-primary mb-2">{content.title}</h1>
          <p className="font-sans text-text-main mb-8">{content.subtitle}</p>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">{content.emailLabel}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FaEnvelope className="text-gray-400" />
                </span>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" 
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">{content.passwordLabel}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <FaLock className="text-gray-400" />
                </span>
                 <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" 
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between">
              <a href="#" className="text-sm text-primary hover:text-accent font-medium">{content.forgotPassword}</a>
            </div>

            <div>
              <button 
                type="submit" 
                className="w-full bg-accent text-primary font-bold py-3 px-4 rounded-md hover:opacity-90 transition-opacity text-lg disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Anmeldung...' : content.loginButton}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {content.registerPrompt} <Link href="/register" className="font-bold text-primary hover:text-accent">{content.registerLink}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

