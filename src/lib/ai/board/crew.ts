import { generateText } from 'ai';
import { getGroqModel, getGeminiModel } from '../providers';

// ------------------------------------------------------------------
// 1. Core Interfaces mimicking CrewAI Architecture
// ------------------------------------------------------------------

export interface AgentConfig {
  role: string;
  goal: string;
  backstory: string;
  temperature?: number;
}

export interface TaskConfig {
  description: string;
  expectedOutput: string;
  agent: Agent;
}

// ------------------------------------------------------------------
// 2. Agent Class
// ------------------------------------------------------------------

export class Agent {
  public role: string;
  public goal: string;
  public backstory: string;
  public temperature: number;

  constructor(config: AgentConfig) {
    this.role = config.role;
    this.goal = config.goal;
    this.backstory = config.backstory;
    this.temperature = config.temperature ?? 0.3;
  }

  /**
   * Generates the system prompt tailored to the CrewAI methodology.
   */
  public getSystemPrompt(): string {
    return `Senin Rolün (Role): ${this.role}\n\nHedefin (Goal): ${this.goal}\n\nGeçmişin ve Karakterin (Backstory): ${this.backstory}\n\nSen, Elyson Sweets (Almanya) için çalışan uzman bir yönetim kurulu üyesisin. Halüsinasyon yapmadan, doğrudan hedefe odaklanan net analizler yaparsın. Gereksiz nezaket kelimeleri kullanma, doğrudan konuya gir. Çıktılarını her zaman beklenen çıktıya (Expected Output) uygun formatta vermelisin.`;
  }
}

// ------------------------------------------------------------------
// 3. Task Class
// ------------------------------------------------------------------

export class Task {
  public description: string;
  public expectedOutput: string;
  public agent: Agent;
  public result: string | null = null;

  constructor(config: TaskConfig) {
    this.description = config.description;
    this.expectedOutput = config.expectedOutput;
    this.agent = config.agent;
  }
}

// ------------------------------------------------------------------
// 4. Crew (Orchestrator) Class
// ------------------------------------------------------------------

export interface CrewConfig {
  tasks: Task[];
  onStepComplete?: (task: Task, result: string) => Promise<void>;
}

export class Crew {
  private tasks: Task[];
  private onStepComplete?: (task: Task, result: string) => Promise<void>;

  constructor(config: CrewConfig) {
    this.tasks = config.tasks;
    this.onStepComplete = config.onStepComplete;
  }

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes the task via the Agent using Vercel AI SDK with Rate Limit protection.
   */
  private async executeTask(task: Task, context: string, attempt = 1): Promise<string> {
    const prompt = `GÖREV (TASK):\n${task.description}\n\nBEKLENEN ÇIKTI (EXPECTED OUTPUT):\n${task.expectedOutput}\n\nŞU ANA KADARKİ TOPLANTI BAĞLAMI:\n${context || 'Bu ilk görevdir. Toplantıyı başlatan ve çerçeveyi çizen sizsiniz.'}`;
    
    // Everyone uses Groq since the Gemini API key provided is not compatible with standard models.
    const activeModel = getGroqModel('openai/gpt-oss-120b');
    const fallbackModel = getGroqModel('qwen/qwen3.8-27b');

    // Throttle for Groq limits (TPM) -> wait 12 seconds between calls to stretch out the TPM bucket over a minute.
    await this.sleep(12000);

    try {
      const { text } = await generateText({
        model: activeModel,
        system: task.agent.getSystemPrompt(),
        prompt: prompt,
        temperature: task.agent.temperature,
      });
      return text.trim();
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.warn(`[Crew] Error executing task for ${task.agent.role} (Attempt ${attempt}):`, errorMessage);

      if (attempt <= 2) {
        await this.sleep(15000); // Exponential backoff waiting for TPM reset
        try {
          const { text } = await generateText({
            model: fallbackModel,
            system: task.agent.getSystemPrompt(),
            prompt: prompt,
            temperature: task.agent.temperature,
          });
          return `[Yedek Sistem Yanıtı] ${text.trim()}`;
        } catch (retryError) {
          console.error(`[Crew] Fallback failed for ${task.agent.role}.`);
        }
      }

      return `[${task.agent.role} şu anda bu görevi sistem yoğunluğu sebebiyle tamamlayamadı. Diğer ekiplerin devam etmesi uygundur.]`;
    }
  }

  /**
   * Kicks off the Crew operation sequentially.
   */
  public async kickoff(): Promise<{ finalResult: string, history: Task[] }> {
    let contextForDirectors = ''; // Truncated context to save TPM limit
    let contextForCEO = '';       // Full context for the CEO to make the final decision
    
    for (const task of this.tasks) {
      const isCEO = task.agent.role === 'ceo';
      const currentContext = isCEO ? contextForCEO : contextForDirectors;

      const result = await this.executeTask(task, currentContext);
      task.result = result;
      
      // Update contexts
      // Directors only see a heavily summarized version to prevent massive token usage (300 chars)
      const shortResultForDirectors = result.length > 300 ? result.substring(0, 300) + '... (Özetlendi)' : result;
      contextForDirectors += `\n\n--- [Bölüm: ${task.agent.role}] ---\nGÖREV ÇIKTISI:\n${shortResultForDirectors}\n`;
      
      // CEO gets a longer version but STILL truncated (1000 chars) to prevent Groq TPM bucket overflow on a single request
      const shortResultForCEO = result.length > 1000 ? result.substring(0, 1000) + '... (Detaylar sistemde kayıtlıdır, bu kısımdan sonrasını özet kabul et.)' : result;
      contextForCEO += `\n\n--- [Bölüm: ${task.agent.role}] ---\nGÖREV ÇIKTISI:\n${shortResultForCEO}\n`;

      if (this.onStepComplete) {
        await this.onStepComplete(task, result);
      }
    }

    return {
      finalResult: this.tasks[this.tasks.length - 1].result || '',
      history: this.tasks
    };
  }
}
