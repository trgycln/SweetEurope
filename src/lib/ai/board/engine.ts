import { boardAgentMap, AgentRole } from './agents';
import { Task, Crew } from './crew';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export interface BoardMeetingConfig {
  topic: string;
  participants: AgentRole[];
  maxRounds?: number;
}

/**
 * Maps the generic topic into a specific expected output for each role.
 */
function getExpectedOutputForRole(role: string): string {
  switch (role) {
    case 'legal':
      return 'Gümrük ve mevzuat açısından potansiyel riskleri listeleyen, Alman kanunlarına dayanan detaylı bir hukuki analiz yap.';
    case 'coo':
      return 'Lojistik sürecini, depo yerleşimini ve kargo operasyonunu maliyet/zaman açısından optimize eden somut, tablolar veya net metrikler içeren eylem planı sun.';
    case 'cmo_horeca':
      return 'HoReCa (B2B) müşterilerine yönelik pazar fırsatlarını ve agresif satış/pazarlama stratejisini içeren veri odaklı detaylı bir rapor oluştur.';
    case 'cfo':
      return 'Operasyonun nakit akışına etkisini, kârlılık oranlarını ve finansal kısıtlamaları belirten Excel mantığında analitik ve detaylı bir sonuç üret.';
    case 'it':
      return 'Sistemin veya operasyonun dijital güvenliğini, otomasyon fırsatlarını ve teknik ihtiyaçlarını listeleyen profesyonel bir rapor sun.';
    case 'ceo':
      return 'Tüm departmanlardan gelen devasa verileri sentezleyerek şirket sahibi (Admin) için tek, kesin, bağlayıcı bir Yönetim Kurulu Kararı çıkar. En sona mutlaka Admin\'in onaylaması gereken 3 aksiyonluk (To-Do List) ekle.';
    default:
      return 'Konuyla ilgili spesifik bir değerlendirme ve aksiyon maddeleri.';
  }
}

/**
 * Runs a multi-agent board meeting utilizing the CrewAI-like architecture.
 */
export async function runBoardMeeting(config: BoardMeetingConfig) {
  const { topic, participants, maxRounds = 1 } = config;
  const supabase = createSupabaseServiceClient();
  const sessionId = `board_meeting_${Date.now()}`;
  
  console.log(`[Board Engine V2] Toplantı Başladı: "${topic}"`);
  const meetingNotes: { role: string; name: string; message: string; created_at?: string }[] = [];

  // Helper to log immediately so UI can update via WebSockets/Polling if needed later
  const logToDb = async (role: string, input: string, output: string) => {
    try {
      await supabase.from('ai_chat_logs').insert({
        session_id: sessionId,
        channel: `board_${role}`,
        user_message: input,
        ai_response: output,
        tools_used: []
      });
    } catch (err) {
      console.error(`[Board Engine] Failed to save log for ${role}:`, err);
    }
  };

  const tasks: Task[] = [];
  const ceoAgent = boardAgentMap['ceo'];

  // 1. CEO Açılış (Eğer detaylı bir plan ise CEO ilk yönlendirmeyi yapsın)
  // We'll skip the CEO opening task and let departments just dive into the topic to save time/tokens.
  
  // 2. Departman Görevleri
  for (let round = 1; round <= maxRounds; round++) {
    for (const role of participants) {
      if (role === 'ceo') continue; 
      
      const agent = boardAgentMap[role];
      if (!agent) continue;

      tasks.push(new Task({
        description: `GÜNDEM KONUSU: ${topic}\n\nLütfen bu konuyu uzmanlık alanına göre analiz et. Diğer yöneticilerin (varsa) önceki çıktılarını dikkate alarak eksik olan, hatalı olan veya senin departmanını ilgilendiren stratejik bir plan oluştur.`,
        expectedOutput: getExpectedOutputForRole(role),
        agent: agent
      }));
    }
  }

  // 3. CEO Karar Görevi (En son)
  tasks.push(new Task({
    description: `GÜNDEM KONUSU: ${topic}\n\nTüm departman yöneticileri analizlerini tamamladı. Lütfen şimdi bu analizleri harmanlayıp şirket sahibi (Admin) için tek, kesin ve tartışmasız bir Yönetim Kurulu Kararı çıkar.`,
    expectedOutput: getExpectedOutputForRole('ceo'),
    agent: ceoAgent
  }));

  // Orkestrasyonu (Crew) başlat
  const crew = new Crew({
    tasks: tasks,
    onStepComplete: async (task, result) => {
      // Her görev bittiğinde DB'ye kaydet
      meetingNotes.push({ role: task.agent.role, name: task.agent.role.toUpperCase(), message: result });
      await logToDb(task.agent.role, `Görev: ${task.description.substring(0, 50)}...`, result);
      console.log(`[Crew] ${task.agent.role} görevini tamamladı.`);
    }
  });

  const { finalResult } = await crew.kickoff();

  console.log(`[Board Engine V2] Toplantı başarıyla tamamlandı: ${sessionId}`);

  return {
    sessionId,
    summary: finalResult,
    notes: meetingNotes,
  };
}
