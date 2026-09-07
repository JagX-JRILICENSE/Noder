/**
 * Noder Collaboration Server
 * Simple y-websocket compatible server for real-time editing.
 *
 * Usage:
 *   npm run collab:server
 *   # or
 *   node collab-server/server.js [port]
 *
 * Default port: 1234
 * Clients connect to: ws://localhost:1234
 */

const http = require('http')
const WebSocket = require('ws')
const Y = require('yjs')
const { setupWSConnection } = require('y-websocket/bin/utils')

const port = process.env.PORT || process.argv[2] || 1234

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Noder Collaboration Server is running.\nConnect via WebSocket.')
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { docName: req.url?.slice(1) || 'noder-default' })
})

server.listen(port, () => {
  console.log(`\n  ✨ Noder Collab Server`)
  console.log(`  ───────────────────────`)
  console.log(`  Listening on ws://localhost:${port}`)
  console.log(`  Share room names with collaborators.`)
  console.log(`  Press Ctrl+C to stop.\n`)
})

process.on('SIGINT', () => {
  console.log('\nShutting down collab server…')
  wss.close()
  server.close()
  process.exit(0)
})
