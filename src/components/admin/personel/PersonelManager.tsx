'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PersonelProfile {
  id: string;
  tam_ad: string | null;
}

interface PersonelManagerProps {
  initialPersonel: PersonelProfile[];
}

export default function PersonelManager({ initialPersonel }: PersonelManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tamAd, setTamAd] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/admin/create-personel-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tam_ad: tamAd || null }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Personel oluşturulamadı');
      } else {
        setSuccess('Personel oluşturuldu');
        setEmail('');
        setPassword('');
        setTamAd('');
        router.refresh();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (userId: string, newName: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tam_ad: newName || null }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Güncelleme yapılamadı');
      } else {
        setSuccess('Profil güncellendi');
        router.refresh();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdToDelete: userId }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Silme başarısız');
      } else {
        setSuccess('Personel silindi');
        router.refresh();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        setError('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Yeni Personel Oluştur</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            className="border rounded-lg px-3 py-2 text-sm"
            value={tamAd}
            onChange={(e) => setTamAd(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="border rounded-lg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Geçici Şifre"
            className="border rounded-lg px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="md:col-span-3 bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {loading ? 'Kaydediliyor...' : 'Personel Oluştur'}
          </button>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Personel Listesi</h2>
        <div className="space-y-3">
          {initialPersonel.length === 0 && (
            <div className="text-sm text-gray-500">Henüz personel yok.</div>
          )}
          {initialPersonel.map((p) => (
            <div key={p.id} className="flex flex-col md:flex-row md:items-center gap-3 border-b pb-3">
              <input
                defaultValue={p.tam_ad || ''}
                placeholder="Ad Soyad"
                className="border rounded-lg px-3 py-2 text-sm flex-1"
                onBlur={(e) => handleUpdateName(p.id, e.target.value)}
              />
              <div className="text-xs text-gray-400 break-all">{p.id}</div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-600">{success}</div>}
    </div>
  );
}
