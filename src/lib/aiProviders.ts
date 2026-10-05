/**
 * AI provider registry + model discovery for BYOK.
 * Lists free/paid models and probes availability when user pastes a key.
 */

export type AIProviderId =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'grok'
  | 'nvidia'
  | 'groq'
  | 'together'
  | 'deepseek'

export interface ModelInfo {
  id: string
  label: string
  free: boolean
  codingScore: number
  context?: number
  available?: boolean
  note?: string
}

export interface ProviderDef {
  id: AIProviderId
  label: string
  tier: 'free' | 'paid' | 'mixed'
  baseUrl: string
  chatPath: string
  modelsPath?: string
  keyHint: string
  docsUrl: string
  defaultModels: ModelInfo[]
  authHeader: (key: string) => Record<string, string>
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    tier: 'mixed',
    baseUrl: 'https://openrouter.ai/api/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    keyHint: 'sk-or-… from openrouter.ai/keys (free models available)',
    docsUrl: 'https://openrouter.ai/docs',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModels: [
      { id: 'openrouter/auto', label: 'Auto (router)', free: true, codingScore: 4, note: 'Picks a free model' },
      { id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (free)', free: true, codingScore: 3 },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)', free: true, codingScore: 4 },
      { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (free)', free: true, codingScore: 5 },
      { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)', free: true, codingScore: 4 },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B', free: false, codingScore: 5 },
      { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', free: false, codingScore: 5 },
      { id: 'openai/gpt-4o', label: 'GPT-4o', free: false, codingScore: 5 },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    tier: 'paid',
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    keyHint: 'sk-… from platform.openai.com',
    docsUrl: 'https://platform.openai.com/docs',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModels: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', free: false, codingScore: 4 },
      { id: 'gpt-4o', label: 'GPT-4o', free: false, codingScore: 5 },
      { id: 'o3-mini', label: 'o3-mini', free: false, codingScore: 5 },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    tier: 'paid',
    baseUrl: 'https://api.anthropic.com/v1',
    chatPath: '/messages',
    keyHint: 'sk-ant-… from console.anthropic.com',
    docsUrl: 'https://docs.anthropic.com',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    defaultModels: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', free: false, codingScore: 5 },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', free: false, codingScore: 4 },
    ],
  },
  {
    id: 'grok',
    label: 'xAI Grok',
    tier: 'paid',
    baseUrl: 'https://api.x.ai/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    keyHint: 'xai-… from console.x.ai',
    docsUrl: 'https://docs.x.ai',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModels: [
      { id: 'grok-3', label: 'Grok 3', free: false, codingScore: 5 },
      { id: 'grok-3-mini', label: 'Grok 3 mini', free: false, codingScore: 4 },
    ],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    tier: 'free',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    chatPath: '/chat/completions',
    keyHint: 'nvapi-… from build.nvidia.com (free tier)',
    docsUrl: 'https://build.nvidia.com',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModels: [
      { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', free: true, codingScore: 3 },
      { id: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', free: true, codingScore: 4 },
      { id: 'qwen/qwen2.5-coder-32b-instruct', label: 'Qwen2.5 Coder 32B', free: true, codingScore: 5 },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    tier: 'free',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatPath: '/chat/completions',
    modelsPath: '/models',
    keyHint: 'gsk_… from console.groq.com (fast free tier)',
    docsUrl: 'https://console.groq.com/docs',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    defaultModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', free: true, codingScore: 4 },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', free: true, codingScore: 3 },
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B', free: true, codingScore: 5 },
    ],
  },
]

export function getProvider(id: AIProviderId) {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0]
}

export function rankModels(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1
    return b.codingScore - a.codingScore
  })
}

export function bestCodingModel(models: ModelInfo[]): ModelInfo | null {
  const ranked = rankModels(models.filter((m) => m.available !== false))
  return ranked[0] || null
}

/** Probe /models when available; mark default models available on success. */
export async function discoverModels(providerId: AIProviderId, apiKey: string): Promise<ModelInfo[]> {
  const prov = getProvider(providerId)
  if (!apiKey.trim()) return prov.defaultModels.map((m) => ({ ...m, available: false }))

  if (prov.modelsPath) {
    try {
      const res = await fetch(`${prov.baseUrl}${prov.modelsPath}`, {
        headers: { ...prov.authHeader(apiKey), 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        const ids = new Set((data.data || data.models || []).map((x: any) => x.id as string))
        if (ids.size) {
          const discovered: ModelInfo[] = []
          for (const m of prov.defaultModels) {
            discovered.push({ ...m, available: ids.has(m.id) || m.id.includes(':free') || m.id.includes('auto') })
          }
          for (const id of ids) {
            if (!prov.defaultModels.some((m) => m.id === id)) {
              const free = id.includes(':free') || prov.tier === 'free'
              discovered.push({ id, label: id, free, codingScore: free ? 3 : 4, available: true })
            }
          }
          return rankModels(discovered)
        }
      }
    } catch {
      /* fall through */
    }
  }

  // Fallback: mark defaults as available if key present
  return prov.defaultModels.map((m) => ({ ...m, available: true }))
}
