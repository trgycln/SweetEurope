import { getMesajlarAction } from '@/app/actions/mesajlar-actions';
import MesajlarClient from './MesajlarClient';

export const metadata = {
  title: 'Gelen Mesajlar | ElysonSweets Admin',
  description: 'İletişim formundan gelen mesajlar',
};

export default async function MesajlarPage() {
  const { data: messages, error } = await getMesajlarAction();

  if (error) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">Hata</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">İletişim Mesajları</h1>
        <p className="mt-1 text-sm text-slate-500">Web sitesinden gelen iletişim mesajlarını okuyun ve yönetin.</p>
      </div>
      
      <MesajlarClient initialMessages={messages || []} />
    </div>
  );
}
