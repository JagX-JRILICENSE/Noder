import { useState } from 'react'
import Editor from '@monaco-editor/react'
import './App.css'

function App() {
  const [code, setCode] = useState(`// Welcome to Noder
// Real-time collaborative code editor by JagX & JRILICENSE

function helloNoder() {
  console.log("Build anything in real time!");
}

helloNoder();
`)

  return (
    <div className="app">
      <header className="titlebar">
        <div className="logo">Noder</div>
        <div className="menu">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Terminal</span>
          <span>Help</span>
        </div>
        <div className="status">Ready</div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-header">EXPLORER</div>
          <div className="file-tree">
            <div className="file active">main.ts</div>
            <div className="file">App.tsx</div>
            <div className="file">package.json</div>
            <div className="file">README.md</div>
          </div>
        </aside>

        <main className="editor-area">
          <div className="tabs">
            <div className="tab active">main.ts</div>
          </div>
          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        </main>
      </div>

      <footer className="statusbar">
        <span>TypeScript</span>
        <span>UTF-8</span>
        <span>Ln 1, Col 1</span>
        <span className="right">Noder v0.1.0 • JagX & JRILICENSE</span>
      </footer>
    </div>
  )
}

export default App
