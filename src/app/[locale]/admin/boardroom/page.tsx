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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Yapay Zeka Yönetim Kurulu Odası <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">C-Suite</span>
          </h1>
          <p className="text-slate-500 mt-3 text-[15px] max-w-2xl leading-relaxed">
            Departman direktörleri ve CEO otonom olarak şirket gündemini tartışır, riskleri eler ve aksiyon planı çıkarır.
          </p>
        </div>
      </div>

      {/* Start Meeting Form Component */}
      <StartMeetingForm onStartMeeting={startMeetingAction} />

      {/* Meeting Histories */}
      <div className="space-y-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6 ml-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FiClock className="w-5 h-5" />
          </div>
          Geçmiş Yönetim Kurulu Kararları
        </h2>
        
        {Object.entries(meetings).map(([sessionId, sessionLogs]) => (
          <div key={sessionId} className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/60 overflow-hidden hover:shadow-[0_4px_25px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="bg-slate-900 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center text-white gap-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <FiCheckCircle className="text-emerald-400 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] tracking-wide text-white/90">Oturum ID</h3>
                  <p className="text-slate-400 font-mono text-xs mt-0.5">{sessionId}</p>
                </div>
              </div>
              <div className="relative z-10 text-xs font-semibold text-slate-300 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5 flex items-center gap-2">
                <FiCalendar className="w-3.5 h-3.5" />
                {new Date(sessionLogs[0].created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50/50">
              {/* Logs are fetched descending, reverse to show chronological order */}
              {[...sessionLogs].reverse().map((log) => {
                const role = log.channel.replace('board_', '');
                const isCEO = role === 'ceo';
                const isFinal = log.user_message?.includes('Nihai Karar') || log.user_message?.includes('şirket sahibi');

                // Role styling map
                const roleMeta: Record<string, { label: string; badge: string; border: string; bg: string }> = {
                  ceo: {
                    label: 'CEO (Başkan)',
                    badge: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
                    border: 'border-blue-200/80',
                    bg: 'bg-gradient-to-br from-blue-50/80 to-indigo-50/30'
                  },
                  legal: {
                    label: 'Gümrük & Hukuk',
                    badge: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
                    border: 'border-amber-200/60',
                    bg: 'bg-amber-50/40'
                  },
                  coo: {
                    label: 'Lojistik & Operasyon',
                    badge: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
                    border: 'border-emerald-200/60',
                    bg: 'bg-emerald-50/40'
                  },
                  cmo_horeca: {
                    label: 'HoReCa Satış',
                    badge: 'bg-purple-500 text-white shadow-lg shadow-purple-500/30',
                    border: 'border-purple-200/60',
                    bg: 'bg-purple-50/40'
                  },
                  cfo: {
                    label: 'Finans',
                    badge: 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30',
                    border: 'border-cyan-200/60',
                    bg: 'bg-cyan-50/40'
                  },
                  it: {
                    label: 'IT & Sistem',
                    badge: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
                    border: 'border-rose-200/60',
                    bg: 'bg-rose-50/40'
                  }
                };

                const meta = roleMeta[role] || {
                  label: role.toUpperCase(),
                  badge: 'bg-slate-700 text-white shadow-md',
                  border: 'border-slate-200',
                  bg: 'bg-white'
                };
                
                return (
                  <div 
                    key={log.id} 
                    className={`relative p-6 sm:p-8 rounded-[1.5rem] border ${meta.border} ${meta.bg} shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md duration-300`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3.5 py-1.5 rounded-xl font-bold ${meta.badge}`}>
                          {meta.label}
                        </span>
                        {isFinal && (
                          <span className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                            <FiCheckCircle className="w-4 h-4" /> Nihai Yönetim Kararı
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/50">
                        <FiClock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="text-slate-700 whitespace-pre-wrap text-[15px] leading-relaxed font-medium prose prose-slate prose-p:my-2 prose-li:my-1 max-w-none prose-strong:text-slate-900 prose-strong:font-bold">
                      {log.ai_response}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {Object.keys(meetings).length === 0 && (
          <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/50 pointer-events-none"></div>
            {error ? (
              <div className="text-rose-600 font-medium relative z-10">
                <p>Veritabanı bağlantı hatası veya 'ai_chat_logs' tablosu bulunamadı.</p>
                <p className="text-sm mt-2 text-rose-500 opacity-80">Lütfen Supabase SQL Editor üzerinden tabloyu oluşturduğunuzdan emin olun.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 relative z-10">
                <div className="w-20 h-20 bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-3xl flex items-center justify-center rotate-3 shadow-inner">
                  <FiUsers className="w-10 h-10 text-blue-400 -rotate-3" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-slate-800 font-bold text-lg">Kayıt Bulunamadı</h3>
                  <p className="text-slate-500 text-sm">Henüz yapılan bir yönetim kurulu toplantısı bulunmuyor.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
