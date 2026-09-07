import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Settings2 } from 'lucide-react'

export type AIProvider = 'openai' | 'anthropic' | 'grok' | 'openrouter' | 'nvidia'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface Props {
  visible: boolean
  onClose: () => void
  contextCode?: string
  contextFile?: string
}

const PROVIDERS: { id: AIProvider; label: string; models: string[]; baseHint: string }[] = [
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], baseHint: 'api.openai.com' },
  { id: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'], baseHint: 'api.anthropic.com' },
  { id: 'grok', label: 'Grok (xAI)', models: ['grok-3-mini', 'grok-3', 'grok-2-latest'], baseHint: 'api.x.ai' },
  { id: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001'], baseHint: 'openrouter.ai' },
  { id: 'nvidia', label: 'NVIDIA NIM', models: ['meta/llama-3.1-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'], baseHint: 'integrate.api.nvidia.com' },
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

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<string> {
  if (!apiKey.trim()) throw new Error('Add your API key in AI settings (BYOK)')

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
      throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
    }
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  const endpoints: Record<Exclude<AIProvider, 'anthropic'>, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    grok: 'https://api.x.ai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/JagX-JRILICENSE/Noder'
    headers['X-Title'] = 'Noder'
  }

  const res = await fetch(endpoints[provider], {
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
    throw new Error(`${provider} ${res.status}: ${t.slice(0, 240)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export default function AIPanel({ visible, onClose, contextCode, contextFile }: Props) {
  const saved = loadSettings()
  const [provider, setProvider] = useState<AIProvider>(saved.provider || 'openrouter')
  const [apiKey, setApiKey] = useState(saved.keys?.[saved.provider || 'openrouter'] || '')
  const [model, setModel] = useState(saved.model || PROVIDERS[3].models[0])
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  if (!visible) return null

  const prov = PROVIDERS.find((p) => p.id === provider)!

  const persist = (next: Partial<{ provider: AIProvider; model: string; apiKey: string }>) => {
    const s = loadSettings()
    const keys = { ...(s.keys || {}) }
    const p = next.provider || provider
    if (next.apiKey !== undefined) keys[p] = next.apiKey
    saveSettings({
      provider: p,
      model: next.model || model,
      keys,
    })
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setInput('')

    const system: Message = {
      role: 'system',
      content:
        'You are Noder AI, a coding assistant inside a real-time collaborative IDE by JagX & JRILICENSE. Be concise, practical, and prefer working code. ' +
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
          <span className="ai-provider-badge">{prov.label}</span>
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
          <label>Provider (BYOK — your key stays in this browser/app)</label>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as AIProvider
              const s = loadSettings()
              setProvider(p)
              setApiKey(s.keys?.[p] || '')
              const models = PROVIDERS.find((x) => x.id === p)!.models
              setModel(models[0])
              persist({ provider: p, model: models[0] })
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          <label>Model</label>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              persist({ model: e.target.value })
            }}
          >
            {prov.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label>API Key ({prov.baseHint})</label>
          <input
            type="password"
            placeholder="Paste API key…"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              persist({ apiKey: e.target.value })
            }}
          />
          <p className="ai-hint">Keys are stored only in localStorage on this machine. Never committed.</p>
        </div>
      )}

      <div className="ai-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            Ask about your code, generate components, debug errors, or plan features.
            {contextFile && <div className="ai-context">Context: {contextFile}</div>}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <div className="ai-msg-role">{m.role === 'user' ? 'You' : 'Noder AI'}</div>
            <pre className="ai-msg-body">{m.content}</pre>
          </div>
        ))}
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
