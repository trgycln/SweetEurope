import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AILogsPage() {
  const supabase = createSupabaseServiceClient();

  // Basic admin check - adjust according to your project's auth strategy
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    // If you have a specific admin role check, do it here
    // redirect('/[locale]/admin/login');
  }

  const { data: logs, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to load AI logs:', error);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">AI Chat Protokolle (Son 100 Mesaj)</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Tarih</th>
                <th className="px-6 py-3 font-semibold">Kanal</th>
                <th className="px-6 py-3 font-semibold w-1/3">Müşteri Mesajı</th>
                <th className="px-6 py-3 font-semibold w-1/3">Yapay Zeka Cevabı</th>
                <th className="px-6 py-3 font-semibold">Kullanılan Araçlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Henüz kayıtlı bir chat bulunmuyor.
                  </td>
                </tr>
              ) : (
                logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        log.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 p-2 bg-slate-100 rounded-lg">
                        {log.user_message}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 p-2 bg-emerald-50 border border-emerald-100 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {log.ai_response}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {log.tools_used && Array.isArray(log.tools_used) && log.tools_used.length > 0 ? (
                          log.tools_used.map((tool: string, idx: number) => (
                            <span key={idx} className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded">
                              {tool}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
