import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { runBoardMeeting } from '@/lib/ai/board/engine';
import { AgentRole } from '@/lib/ai/board/agents';
import { revalidatePath } from 'next/cache';
import StartMeetingForm from './StartMeetingForm';
import { FiCalendar, FiClock, FiCheckCircle } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

export default async function BoardroomPage() {
  const supabase = createSupabaseServiceClient();

  // Fetch only board meeting logs
  const { data: logs, error } = await supabase
    .from('ai_chat_logs')
    .select('*')
    .ilike('channel', 'board_%')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to load board logs:', error);
  }

  // Group logs by session_id
  const meetings: Record<string, any[]> = {};
  logs?.forEach(log => {
    if (!meetings[log.session_id]) meetings[log.session_id] = [];
    meetings[log.session_id].push(log);
  });

  async function startMeetingAction(formData: FormData) {
    'use server';
    const topic = formData.get('topic') as string;
    const participantsRaw = formData.get('participants') as string;
    const roundsRaw = formData.get('rounds') as string;

    let participants: AgentRole[] = ['legal', 'coo', 'cmo_horeca', 'cfo'];
    if (participantsRaw) {
      try {
        participants = JSON.parse(participantsRaw);
      } catch (e) {
        console.error('Failed to parse participants:', e);
      }
    }

    const rounds = roundsRaw ? parseInt(roundsRaw, 10) : 1;
    
    await runBoardMeeting({
      topic,
      participants,
      maxRounds: rounds
    });

    revalidatePath('/[locale]/admin/boardroom', 'page');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Yapay Zeka Yönetim Kurulu Odası (C-Suite Boardroom)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Departman direktörleri ve CEO otonom olarak şirket gündemini tartışır, riskleri eler ve aksiyon planı çıkarır.
          </p>
        </div>
      </div>

      {/* Start Meeting Form Component */}
      <StartMeetingForm onStartMeeting={startMeetingAction} />

      {/* Meeting Histories */}
      <div className="space-y-8">
        {Object.entries(meetings).map(([sessionId, sessionLogs]) => (
          <div key={sessionId} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 px-6 py-3 flex justify-between items-center text-white">
              <h3 className="font-semibold text-sm">Oturum: {sessionId}</h3>
              <span className="text-xs text-slate-300">
                {new Date(sessionLogs[0].created_at).toLocaleString('tr-TR')}
              </span>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Logs are fetched descending, reverse to show chronological order */}
              {[...sessionLogs].reverse().map((log) => {
                const role = log.channel.replace('board_', '');
                const isCEO = role === 'ceo';
                const isFinal = log.user_message?.includes('Nihai Karar') || log.user_message?.includes('şirket sahibi');

                // Role styling map
                const roleMeta: Record<string, { label: string; badge: string; border: string; bg: string }> = {
                  ceo: {
                    label: 'CEO (Yönetim Kurulu Başkanı)',
                    badge: 'bg-blue-600 text-white',
                    border: 'border-blue-300',
                    bg: 'bg-gradient-to-br from-blue-50/70 to-indigo-50/50'
                  },
                  legal: {
                    label: 'Gümrük & Hukuk Direktörü',
                    badge: 'bg-amber-100 text-amber-800 border-amber-300',
                    border: 'border-amber-200',
                    bg: 'bg-amber-50/30'
                  },
                  coo: {
                    label: 'Lojistik & Operasyon Müdürü',
                    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    border: 'border-emerald-200',
                    bg: 'bg-emerald-50/30'
                  },
                  cmo_horeca: {
                    label: 'HoReCa Satış ve Pazar Analisti',
                    badge: 'bg-purple-100 text-purple-800 border-purple-300',
                    border: 'border-purple-200',
                    bg: 'bg-purple-50/30'
                  },
                  cfo: {
                    label: 'Finans ve Muhasebe Direktörü',
                    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                    border: 'border-cyan-200',
                    bg: 'bg-cyan-50/30'
                  },
                  it: {
                    label: 'IT & Sistem/DSGVO Direktörü',
                    badge: 'bg-rose-100 text-rose-800 border-rose-300',
                    border: 'border-rose-200',
                    bg: 'bg-rose-50/30'
                  }
                };

                const meta = roleMeta[role] || {
                  label: role.toUpperCase(),
                  badge: 'bg-slate-100 text-slate-800',
                  border: 'border-slate-200',
                  bg: 'bg-white'
                };
                
                return (
                  <div 
                    key={log.id} 
                    className={`p-5 rounded-2xl border ${meta.border} ${meta.bg} transition-all shadow-sm`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${meta.badge}`}>
                          {meta.label}
                        </span>
                        {isFinal && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-600 text-white flex items-center gap-1">
                            <FiCheckCircle className="w-3 h-3" /> Nihai Yönetim Kararı
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <FiClock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleTimeString('tr-TR')}
                      </div>
                    </div>

                    <div className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed font-normal">
                      {log.ai_response}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {Object.keys(meetings).length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            {error ? (
              <div className="text-rose-600 font-medium">
                <p>Veritabanı bağlantı hatası veya 'ai_chat_logs' tablosu bulunamadı.</p>
                <p className="text-sm mt-2 text-rose-500">Lütfen Supabase SQL Editor üzerinden tabloyu oluşturduğunuzdan emin olun.</p>
              </div>
            ) : (
              <span className="text-slate-500">Henüz yapılan bir yönetim kurulu toplantısı bulunmuyor.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
