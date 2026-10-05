import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { restoreLastWorkspace } from './lib/workspaceRestore'

// Restore last project path before first paint when possible
;(async () => {
  try {
    const last = await restoreLastWorkspace()
    if (last) {
      ;(window as any).__noderRestoredWorkspace = last
    }
  } catch {}
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})()
