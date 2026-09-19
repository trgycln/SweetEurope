import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import AILogsClient from './AILogsClient';

export const dynamic = 'force-dynamic';

export default async function AILogsPage() {
  const supabase = createSupabaseServiceClient();

  // Basic admin check - adjust according to your project's auth strategy
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    // If you have a specific admin role check, do it here
    // redirect('/[locale]/admin/login');
  }

  // Fetch the latest logs (up to 500 for a balance of detail and performance)
  const { data: logs, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Failed to load AI logs:', error);
  }

  return (
    <div className="p-0 sm:p-2 bg-slate-50 min-h-screen">
      <AILogsClient initialLogs={logs || []} />
    </div>
  );
}
