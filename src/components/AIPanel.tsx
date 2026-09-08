import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Settings2, FilePlus, FolderPlus, CheckCircle2 } from 'lucide-react'

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
  workspace?: string | null
  /** Replace entire editor buffer with code */
  onWriteEditor?: (code: string, filename?: string) => void
  /** Append / insert snippet into editor */
  onInsertCode?: (code: string) => void
  /** Write a file under workspace (creates parent folders) */
  onWriteFile?: (relativePath: string, content: string) => Promise<boolean> | boolean
  /** Status line feedback */
  onStatus?: (msg: string) => void
}

interface ProviderConfig {
  id: AIProvider
  label: string
  tier: 'free' | 'paid'
  models: { id: string; label: string }[]
  baseHint: string
}

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
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 (free)' },
      { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)' },
      { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code (free)' },
      { id: 'poolside/laguna-s-2.1:free', label: 'Laguna S 2.1 coding (free)' },
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
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen (PAID via OpenRouter)',
    tier: 'paid',
    baseHint: 'openrouter.ai key',
    models: [
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
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
      { id: 'moonshot-v1-8k', label: 'Moonshot v1 8k' },
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

/** Extract fenced code blocks; supports ```lang and ```path:relative/path */
function extractCodeBlocks(text: string): { lang: string; path?: string; code: string }[] {
  const out: { lang: string; path?: string; code: string }[] = []
  const re = /```([^\n`]*)\n([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const meta = (m[1] || '').trim()
    const code = m[2].replace(/\n$/, '')
    let path: string | undefined
    let lang = meta
    if (meta.startsWith('path:')) {
      path = meta.slice(5).trim()
      lang = path.split('.').pop() || ''
    } else if (meta.includes('/') || meta.includes('\\')) {
      path = meta
      lang = path.split('.').pop() || ''
    }
    out.push({ lang, path, code })
  }
  return out
}

/** <<<FILE relative/path>>> ... <<<END>>> */
function extractFileDirectives(text: string): { path: string; code: string }[] {
  const out: { path: string; code: string }[] = []
  const re = /<<<FILE\s+([^>]+?)>>>\s*([\s\S]*?)<<<END>>>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ path: m[1].trim(), code: m[2].replace(/^\n/, '').replace(/\n$/, '') })
  }
  return out
}

function extractWriteEditor(text: string): string | null {
  const m = text.match(/<<<WRITE_EDITOR>>>\s*([\s\S]*?)<<<END>>>/i)
  if (m) return m[1].replace(/^\n/, '').replace(/\n$/, '')
  return null
}

function endpointFor(provider: AIProvider, model: string): string {
  if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions'
  if (provider === 'grok') return 'https://api.x.ai/v1/chat/completions'
  if (provider === 'nvidia') return 'https://integrate.api.nvidia.com/v1/chat/completions'
  if (provider === 'kimi' && model.startsWith('moonshot-v1')) {
    return 'https://api.moonshot.cn/v1/chat/completions'
  }
  return 'https://openrouter.ai/api/v1/chat/completions'
}

async function callProvider(
  provider: AIProvider,
  apiKey: string,
  model: string,
  messages: Message[]
): Promise<string> {
  if (!apiKey.trim()) throw new Error('Add your API key in AI settings (BYOK). Free: openrouter.ai')

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
        max_tokens: 4096,
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
      temperature: 0.35,
      max_tokens: 4096,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    let hint = res.status === 404
      ? ' — Model offline. Switch to Auto Free Router.'
      : ''
    throw new Error(`${provider} ${res.status}: ${t.slice(0, 220)}${hint}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function buildSystemPrompt(workspace?: string | null, contextFile?: string, contextCode?: string) {
  return [
    'You are Noder AI Agent inside a real IDE (not a chat-only bot).',
    'When the user asks to BUILD, CREATE, or WRITE code, you MUST put the code into the project — never only talk about it.',
    '',
    'OUTPUT RULES (always follow when producing code):',
    '1) Single file for the open editor: wrap the FULL file content in:',
    '   <<<WRITE_EDITOR>>>',
    '   ...full source code...',
    '   <<<END>>>',
    '2) Multiple project files / folders: for EACH file use either:',
    '   <<<FILE relative/path/to/file.ext>>>',
    '   ...file contents...',
    '   <<<END>>>',
    '   OR a markdown fence: ```path:relative/path/to/file.ext',
    '   ...contents...',
    '   ```',
    '3) Paths are relative to the workspace. Parent folders are created automatically.',
    '4) Prefer complete runnable files over short snippets.',
    '5) Brief explanation is OK after the file blocks — keep it short.',
    '',
    workspace ? `Workspace is open: ${workspace}` : 'No workspace folder yet — still use WRITE_EDITOR for the main code.',
    contextFile ? `Active file: ${contextFile}` : '',
    contextCode ? `Current editor content (truncated):\n${contextCode.slice(0, 5000)}` : '',
  ].filter(Boolean).join('\n')
}

export default function AIPanel({
  visible,
  onClose,
  contextCode,
  contextFile,
  workspace,
  onWriteEditor,
  onInsertCode,
  onWriteFile,
  onStatus,
}: Props) {
  const saved = loadSettings()
  const defaultProv = PROVIDERS.find((p) => p.id === (saved.provider || 'openrouter')) || PROVIDERS[0]
  const [provider, setProvider] = useState<AIProvider>(defaultProv.id)
  const [apiKey, setApiKey] = useState(saved.keys?.[defaultProv.id] || '')
  const [model, setModel] = useState(saved.model || defaultProv.models[0].id)
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [autoApply, setAutoApply] = useState(saved.autoApply !== false) // default ON
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastApplied, setLastApplied] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading, lastApplied])

  useEffect(() => {
    if (model === 'google/gemini-2.0-flash-001' || model.includes('gemini-2.0-flash-001')) {
      setModel('openrouter/free')
      persist({ model: 'openrouter/free' })
    }
  }, [])

  if (!visible) return null

  const prov = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0]

  const persist = (next: Partial<{ provider: AIProvider; model: string; apiKey: string; autoApply: boolean }>) => {
    const s = loadSettings()
    const keys = { ...(s.keys || {}) }
    const p = next.provider || provider
    if (next.apiKey !== undefined) keys[p] = next.apiKey
    saveSettings({
      provider: p,
      model: next.model || model,
      keys,
      autoApply: next.autoApply !== undefined ? next.autoApply : autoApply,
    })
  }

  async function applyAgentActions(reply: string): Promise<string[]> {
    const done: string[] = []

    // Explicit multi-file directives
    const files = [
      ...extractFileDirectives(reply),
      ...extractCodeBlocks(reply)
        .filter((b) => b.path)
        .map((b) => ({ path: b.path!, code: b.code })),
    ]

    // Deduplicate by path
    const seen = new Set<string>()
    for (const f of files) {
      const path = f.path.replace(/^\.?[/\\]/, '')
      if (!path || seen.has(path)) continue
      seen.add(path)
      if (onWriteFile) {
        const ok = await onWriteFile(path, f.code)
        if (ok) done.push(`Wrote ${path}`)
        else done.push(`Failed ${path}`)
      }
    }

    // WRITE_EDITOR block
    const editorBody = extractWriteEditor(reply)
    if (editorBody && onWriteEditor) {
      onWriteEditor(editorBody)
      done.push('Wrote into editor')
    } else if (autoApply && onWriteEditor && files.length === 0) {
      // No path/files: take first code fence into editor
      const blocks = extractCodeBlocks(reply)
      if (blocks.length === 1) {
        onWriteEditor(blocks[0].code)
        done.push('Wrote code into editor')
      } else if (blocks.length > 1 && onWriteFile) {
        // Multiple unnamed blocks — put first in editor
        onWriteEditor(blocks[0].code)
        done.push('Wrote first code block into editor')
      } else if (blocks.length === 1 && onInsertCode) {
        onInsertCode(blocks[0].code)
        done.push('Inserted code into editor')
      }
    }

    return done
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setLastApplied(null)
    setInput('')

    const system: Message = {
      role: 'system',
      content: buildSystemPrompt(workspace, contextFile, contextCode),
    }

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const reply = await callProvider(provider, apiKey, model, [system, ...next])
      setMessages([...next, { role: 'assistant', content: reply }])

      if (autoApply) {
        const results = await applyAgentActions(reply)
        if (results.length) {
          const msg = results.join(' · ')
          setLastApplied(msg)
          onStatus?.(msg)
        }
      }
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const manualApply = async (content: string) => {
    const results = await applyAgentActions(content)
    if (results.length) {
      setLastApplied(results.join(' · '))
      onStatus?.(results.join(' · '))
    } else if (onWriteEditor) {
      const blocks = extractCodeBlocks(content)
      if (blocks[0]) {
        onWriteEditor(blocks[0].code)
        setLastApplied('Wrote into editor')
      }
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-title">
          <Sparkles size={16} />
          <span>AI Agent</span>
          <span className={`ai-provider-badge ${prov.tier}`}>
            {prov.tier === 'free' ? 'FREE' : 'PAID'} · {prov.label.split('(')[0].trim()}
          </span>
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
          <label>Provider — prefer FREE</label>
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
          <label className="ai-check">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => {
                setAutoApply(e.target.checked)
                persist({ autoApply: e.target.checked })
              }}
            />
            Auto-write code into editor & create files (recommended)
          </label>
          <p className="ai-hint">
            Open a folder first so the agent can create project files. Code is applied to the editor automatically — not only shown in chat.
          </p>
        </div>
      )}

      <div className="ai-messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            <strong>Agent mode:</strong> say what to build. Code goes into the <em>editor</em> and project folders — not only this chat.
            <br />Example: “Create a pygame snake game with main.py and README”
            {contextFile && <div className="ai-context">Context: {contextFile}</div>}
            {!workspace && <div className="ai-context">Tip: Open Folder so multi-file projects can be written to disk.</div>}
          </div>
        )}
        {messages.map((m, i) => {
          const blocks = m.role === 'assistant' ? extractCodeBlocks(m.content) : []
          return (
            <div key={i} className={`ai-msg ${m.role}`}>
              <div className="ai-msg-role">{m.role === 'user' ? 'You' : 'Noder AI'}</div>
              <pre className="ai-msg-body">{m.content}</pre>
              {m.role === 'assistant' && (
                <div className="ai-actions">
                  <button className="btn-small ai-insert" onClick={() => manualApply(m.content)}>
                    <FolderPlus size={12} /> Apply to project / editor
                  </button>
                  {blocks[0] && onInsertCode && (
                    <button className="btn-small ai-insert" onClick={() => onInsertCode(blocks[0].code)}>
                      <FilePlus size={12} /> Insert snippet only
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {loading && (
          <div className="ai-msg assistant">
            <div className="ai-msg-role">Noder AI</div>
            <div className="ai-thinking">Building… writing files & editor</div>
          </div>
        )}
        {lastApplied && (
          <div className="ai-applied">
            <CheckCircle2 size={14} /> {lastApplied}
          </div>
        )}
        {error && <div className="gh-error">{error}</div>}
      </div>

      <div className="ai-input-row">
        <textarea
          placeholder={workspace ? 'Build something… (auto-writes files)' : 'Build something… (open a folder for multi-file)'}
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
