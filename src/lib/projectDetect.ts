/** Detect project type from workspace file names and suggest preview/run commands. */

export type ProjectKind =
  | 'flutter'
  | 'vite'
  | 'next'
  | 'create-react-app'
  | 'vue'
  | 'python'
  | 'node'
  | 'static'
  | 'unknown'

export interface ProjectInfo {
  kind: ProjectKind
  label: string
  previewUrl: string
  runCommands: string[]
  installCommand?: string
  notes: string
}

export function detectProjectFromNames(names: string[]): ProjectInfo {
  const lower = names.map((n) => n.toLowerCase().replace(/\\/g, '/'))
  const has = (s: string) => lower.some((f) => f === s || f.endsWith('/' + s) || f.includes(s))

  if (has('pubspec.yaml') || has('pubspec.yml')) {
    return {
      kind: 'flutter',
      label: 'Flutter',
      previewUrl: 'http://localhost:8080',
      installCommand: 'flutter pub get',
      runCommands: ['flutter run -d web-server --web-port 8080'],
      notes: 'App Preview → http://localhost:8080 after flutter web-server starts.',
    }
  }
  if (has('next.config.js') || has('next.config.mjs') || has('next.config.ts')) {
    return {
      kind: 'next',
      label: 'Next.js',
      previewUrl: 'http://localhost:3000',
      installCommand: 'npm install',
      runCommands: ['npm run dev'],
      notes: 'App Preview → http://localhost:3000',
    }
  }
  if (has('vite.config.js') || has('vite.config.ts') || has('vite.config.mjs')) {
    return {
      kind: 'vite',
      label: 'Vite',
      previewUrl: 'http://localhost:5173',
      installCommand: 'npm install',
      runCommands: ['npm run dev'],
      notes: 'App Preview → http://localhost:5173',
    }
  }
  if (has('vue.config.js') || lower.some((f) => f.endsWith('.vue'))) {
    return {
      kind: 'vue',
      label: 'Vue',
      previewUrl: 'http://localhost:5173',
      installCommand: 'npm install',
      runCommands: ['npm run dev'],
      notes: 'Use App Preview with the Vite/Vue dev URL.',
    }
  }
  if (has('package.json')) {
    return {
      kind: 'node',
      label: 'Node / npm',
      previewUrl: 'http://localhost:3000',
      installCommand: 'npm install',
      runCommands: ['npm run dev', 'npm start'],
      notes: 'Check package.json scripts; try App Preview on :3000 or :5173.',
    }
  }
  if (has('requirements.txt') || has('pyproject.toml') || has('manage.py')) {
    return {
      kind: 'python',
      label: 'Python',
      previewUrl: 'http://localhost:8000',
      installCommand: 'pip install -r requirements.txt',
      runCommands: ['python main.py', 'uvicorn main:app --reload'],
      notes: 'Run in Terminal; web apps often on :8000.',
    }
  }
  if (lower.some((f) => f.endsWith('.html'))) {
    return {
      kind: 'static',
      label: 'Static HTML',
      previewUrl: '',
      runCommands: [],
      notes: 'Open an .html file and use Source Preview for animations.',
    }
  }
  return {
    kind: 'unknown',
    label: 'Project',
    previewUrl: 'http://localhost:5173',
    runCommands: [],
    notes: 'Open a file or run your usual dev command in Terminal.',
  }
}

/** Quick scan of common root config files via electron readDir */
export async function scanWorkspaceProject(workspace: string | null): Promise<ProjectInfo> {
  if (!workspace || !window.electronAPI?.readDir) {
    return detectProjectFromNames([])
  }
  try {
    const entries = await window.electronAPI.readDir(workspace)
    const names = entries.map((e) => e.name)
    for (const e of entries.filter((x) => x.isDirectory).slice(0, 8)) {
      try {
        const sub = await window.electronAPI.readDir(e.path)
        names.push(...sub.map((s) => s.name))
      } catch {}
    }
    return detectProjectFromNames(names)
  } catch {
    return detectProjectFromNames([])
  }
}
