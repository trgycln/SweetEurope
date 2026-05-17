import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { KanbanBoard } from '@/components/portal/gorevler/KanbanBoard';
import {
  addMyTaskAction, deleteTaskAction,
  updateGorevDurumAction, addAltGorevAction,
  toggleAltGorevAction, deleteAltGorevAction,
  addGorevNotuAction, deleteGorevNotuAction,
  updateGorevAction,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function GorevlerimPage({
  params
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

  // Tüm görevleri alt görevler ve notlarla birlikte çek
  const { data: gorevler } = await supabase
    .from('gorevler')
    .select(`
      id, baslik, aciklama, son_tarih, tamamlandi,
      oncelik, durum, sahip_id, atanan_kisi_id, ilgili_firma_id,
      alt_gorevler ( id, baslik, tamamlandi, olusturma_tarihi ),
      gorev_notlari ( id, not_metni, kullanici_id, olusturma_tarihi )
    `)
    .or(`sahip_id.eq.${user.id},atanan_kisi_id.eq.${user.id},olusturan_kisi_id.eq.${user.id}`)
    .order('olusturma_tarihi', { referencedTable: 'alt_gorevler', ascending: true })
    .order('olusturma_tarihi', { referencedTable: 'gorev_notlari', ascending: true });

  // Server action wrappers
  const handleAddTask = async (fd: FormData) => {
    'use server';
    await addMyTaskAction(fd, locale);
  };
  const handleDeleteTask = async (fd: FormData) => {
    'use server';
    await deleteTaskAction(fd, locale);
  };
  const handleUpdateDurum = async (gorevId: string, yeniDurum: string) => {
    'use server';
    await updateGorevDurumAction(gorevId, yeniDurum, locale);
  };
  const handleAddAltGorev = async (gorevId: string, baslik: string) => {
    'use server';
    await addAltGorevAction(gorevId, baslik, locale);
  };
  const handleToggleAltGorev = async (altGorevId: string, tamamlandi: boolean) => {
    'use server';
    await toggleAltGorevAction(altGorevId, tamamlandi, locale);
  };
  const handleDeleteAltGorev = async (altGorevId: string) => {
    'use server';
    await deleteAltGorevAction(altGorevId, locale);
  };
  const handleAddNot = async (gorevId: string, notMetni: string) => {
    'use server';
    await addGorevNotuAction(gorevId, notMetni, locale);
  };
  const handleDeleteNot = async (notId: string) => {
    'use server';
    await deleteGorevNotuAction(notId, locale);
  };
  const handleUpdateGorev = async (
    gorevId: string,
    updates: { baslik?: string; son_tarih?: string | null; oncelik?: string; aciklama?: string }
  ) => {
    'use server';
    await updateGorevAction(gorevId, updates, locale);
  };

  return (
    <KanbanBoard
      locale={locale}
      currentUserId={user.id}
      gorevler={(gorevler || []) as any}
      onAddTask={handleAddTask}
      onDeleteTask={handleDeleteTask}
      onUpdateDurum={handleUpdateDurum}
      onAddAltGorev={handleAddAltGorev}
      onToggleAltGorev={handleToggleAltGorev}
      onDeleteAltGorev={handleDeleteAltGorev}
      onAddNot={handleAddNot}
      onDeleteNot={handleDeleteNot}
      onUpdateGorev={handleUpdateGorev}
    />
  );
}
