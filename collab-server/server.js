const { WebSocketServer } = require('ws')
const http = require('http')
const PORT = process.env.PORT || 1234
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Noder collab server')
})
const wss = new WebSocketServer({ server })
const rooms = new Map()
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const room = url.searchParams.get('room') || 'default'
  if (!rooms.has(room)) rooms.set(room, new Set())
  rooms.get(room).add(ws)
  ws.room = room
  ws.on('message', (data) => {
    const peers = rooms.get(ws.room)
    if (!peers) return
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === 1) peer.send(data)
    }
  })
  ws.on('close', () => {
    const peers = rooms.get(ws.room)
    if (peers) {
      peers.delete(ws)
      if (peers.size === 0) rooms.delete(ws.room)
    }
  })
})
server.listen(PORT, () => console.log(`Noder collab server on :${PORT}`))
