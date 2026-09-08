import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Settings2, FilePlus } from 'lucide-react'

export type AIProvider = 'openrouter' | 'nvidia' | 'openai' | 'anthropic' | 'grok' | 'qwen' | 'kimi'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface Props {
  visible: boolean
  onClose: () => void
  contextCode?: string
  contextFile?: string
  onInsertCode?: (code: string) => void
}

interface ProviderConfig {
  id: AIProvider
  label: string
  tier: 'free' | 'paid'
  models: { id: string; label: string }[]
  baseHint: string
}

/** Free-first catalog. OpenRouter free IDs must use :free or openrouter/free */
const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter (FREE)',
    tier: 'free',
    baseHint: 'openrouter.ai — free key',
    models: [
      { id: 'openrouter/free', label: 'Auto Free Router ★' },
      { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
      { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)' },
      { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (free)' },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra (free)' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super (free)' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (free)' },
      { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)' },
      { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code (free)' },
      { id: 'poolside/laguna-s-2.1:free', label: 'Laguna S 2.1 coding (free)' },
      { id: 'thinkingmachines/inkling:free', label: 'Inkling (free)' },
      { id: 'inclusionai/ling-3.0-flash-sante:free', label: 'Ling 3.0 Flash (free)' },
      { id: 'liquid/lfm-2.5-2.6b:free', label: 'Liquid LFM2.5 (free)' },
    ],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM (FREE tier)',
    tier: 'free',
    baseHint: 'build.nvidia.com API key',
    models: [
      { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
      { id: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
      { id: 'google/gemma-2-9b-it', label: 'Gemma 2 9B' },
      { id: 'mistralai/mistral-7b-instruct-v0.3', label: 'Mistral 7B' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI / ChatGPT (PAID)',
    tier: 'paid',
    baseHint: 'api.openai.com',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'o4-mini', label: 'o4-mini' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude (PAID)',
    tier: 'paid',
    baseHint: 'api.anthropic.com',
    models: [
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4' },
    ],
  },
  {
    id: 'grok',
    label: 'Grok / xAI (PAID)',
    tier: 'paid',
    baseHint: 'api.x.ai',
    models: [
      { id: 'grok-3-mini', label: 'Grok 3 mini' },
      { id: 'grok-3', label: 'Grok 3' },
      { id: 'grok-2-latest', label: 'Grok 2' },
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen (PAID via OpenRouter)',
    tier: 'paid',
    baseHint: 'openrouter.ai key',
    models: [
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
      { id: 'qwen/qwen3-8b', label: 'Qwen3 8B' },
      { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen2.5 72B' },
    ],
  },
  {
    id: 'kimi',
    label: 'Kimi / Moonshot (PAID)',
    tier: 'paid',
    baseHint: 'api.moonshot.cn or OpenRouter',
    models: [
      { id: 'moonshotai/kimi-k2', label: 'Kimi K2 (OpenRouter)' },
      { id: 'moonshot-v1-8k', label: 'Moonshot v1 8k (direct)' },
      { id: 'moonshot-v1-32k', label: 'Moonshot v1 32k (direct)' },
    ],
  },
]

const STORAGE_KEY = 'noder-ai-settings'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveSettings(s: Record<string, any>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function extractCode(text: string): string | null {
  const m = text.match(/```(?:[\w.+-]*)?\n([\s\S]*?)```/)
  return m ? m[1].trim() : null
}

function endpointFor(provider: AIProvider, model: string): string {
  if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions'
  if (provider === 'grok') return 'https://api.x.ai/v1/chat/completions'
  if (provider === 'nvidia') return 'https://integrate.api.nvidia.com/v1/chat/completions'
  if (provider === 'kimi' && model.startsWith('moonshot-v1')) {
    return 'https://api.moonshot.cn/v1/chat/completions'
  }
  // openrouter, qwen, kimi-via-or, default
  return 'https://openrouter.ai/api/v1/chat/completions'
}

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<string> {
  if (!apiKey.trim()) throw new Error('Add your API key in AI settings (BYOK). Free: get a key at openrouter.ai')

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        system: messages.find((m) => m.role === 'system')?.content,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Anthropic ${res.status}: ${t.slice(0, 220)}`)
    }
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  const url = endpointFor(provider, model)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (url.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://github.com/JagX-JRILICENSE/Noder'
    headers['X-Title'] = 'Noder'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    let hint = ''
    if (res.status === 404) {
      hint = ' — Model ID invalid or offline. Switch to "Auto Free Router" or another FREE model.'
    }
    throw new Error(`${provider} ${res.status}: ${t.slice(0, 220)}${hint}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default function AIPanel({ visible, onClose, contextCode, contextFile, onInsertCode }: Props) {
  const saved = loadSettings()
  const defaultProv = PROVIDERS.find((p) => p.id === (saved.provider || 'openrouter')) || PROVIDERS[0]
  const [provider, setProvider] = useState<AIProvider>(defaultProv.id)
  const [apiKey, setApiKey] = useState(saved.keys?.[defaultProv.id] || '')
  const [model, setModel] = useState(saved.model || defaultProv.models[0].id)
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  // Migrate broken old model IDs
  useEffect(() => {
    if (model === 'google/gemini-2.0-flash-001' || model.includes('gemini-2.0-flash-001')) {
      setModel('openrouter/free')
      persist({ model: 'openrouter/free' })
    }
  }, [])

  if (!visible) return null

  const prov = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  const persist = (next: Partial<{ provider: AIProvider; model: string; apiKey: string }>) => {
    const s = loadSettings()
    const keys = { ...(s.keys || {}) }
    const p = next.provider || provider
    if (next.apiKey !== undefined) keys[p] = next.apiKey
    saveSettings({ provider: p, model: next.model || model, keys })
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setInput('')

    const system: Message = {
      role: 'system',
      content:
        'You are Noder AI, a coding assistant inside a real-time collaborative IDE by JagX & JRILICENSE. Be concise, practical, and prefer working code in fenced blocks. Help build desktop apps and real games (pygame, etc.). ' +
        (contextFile ? `Active file: ${contextFile}. ` : '') +
        (contextCode ? `Current editor content (may be truncated):\n\n${contextCode.slice(0, 6000)}` : ''),
    }

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const reply = await callProvider(provider, apiKey, model, [system, ...next])
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-title">
          <Sparkles size={16} />
          <span>AI Assistant</span>
          <span className={`ai-provider-badge ${prov.tier}`}>{prov.tier === 'free' ? 'FREE' : 'PAID'} · {prov.label.split('(')[0].trim()}</span>
        </div>
        <div className="ai-header-actions">
          <button className="icon-btn" title="API settings" onClick={() => setShowSettings((v) => !v)}>
            <Settings2 size={14} />
          </button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {showSettings && (
        <div className="ai-settings">
          <label>Provider — prefer FREE (OpenRouter / NVIDIA)</label>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as AIProvider
              const s = loadSettings()
              const cfg = PROVIDERS.find((x) => x.id === p)!
              setProvider(p)
              setApiKey(s.keys?.[p] || '')
              setModel(cfg.models[0].id)
              persist({ provider: p, model: cfg.models[0].id })
            }}
          >
            <optgroup label="Free">
              {PROVIDERS.filter((p) => p.tier === 'free').map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Paid">
              {PROVIDERS.filter((p) => p.tier === 'paid').map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          </select>
          <label>Model</label>
          <select value={model} onChange={(e) => { setModel(e.target.value); persist({ model: e.target.value }) }}>
            {prov.models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <label>API Key ({prov.baseHint})</label>
          <input
            type="password"
            placeholder="Paste API key…"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); persist({ apiKey: e.target.value }) }}
          />
          <p className="ai-hint">
            Free: create a key at openrouter.ai (no credit card for :free models). Keys stay on this PC only.
          </p>
        </div>
      )}

      <div className="ai-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            Use <strong>OpenRouter FREE</strong> models or NVIDIA. Ask to generate code, games (pygame), or fix bugs.
            {contextFile && <div className="ai-context">Context: {contextFile}</div>}
          </div>
        )}
        {messages.map((m, i) => {
          const code = m.role === 'assistant' ? extractCode(m.content) : null
          return (
            <div key={i} className={`ai-msg ${m.role}`}>
              <div className="ai-msg-role">{m.role === 'user' ? 'You' : 'Noder AI'}</div>
              <pre className="ai-msg-body">{m.content}</pre>
              {code && onInsertCode && (
                <button className="btn-small ai-insert" onClick={() => onInsertCode(code)}>
                  <FilePlus size={12} /> Insert code into editor
                </button>
              )}
            </div>
          )
        })}
        {loading && <div className="ai-msg assistant"><div className="ai-msg-role">Noder AI</div><div className="ai-thinking">Thinking…</div></div>}
        {error && <div className="gh-error">{error}</div>}
      </div>

      <div className="ai-input-row">
        <textarea
          placeholder="Ask Noder AI…"
          value={input}
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="btn-primary ai-send" disabled={loading || !input.trim()} onClick={send}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
