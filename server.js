'use strict';
// 철거반 중계 서버: 같은 방 사람끼리 메시지를 전달만 한다. 판정은 방장(먼저 들어온 사람) 브라우저가 한다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
// 게임 게시 사이트에 올린 판이 이 서버에 접속할 수 있게 허용한다.
const PLAY_ORIGINS = ['https://sheet-play.sanai-club.workers.dev'];

const page = path.join(__dirname, 'index.html');
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/'){
    // 이 서버에서 직접 연 게임은 이 서버에 접속한다
    fs.readFile(page, 'utf8', (err, html) => {
      if (err){ res.writeHead(500); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html.replace('<script type="module">', '<script>window.DEMOLITION_SERVER = location.origin;</script>\n<script type="module">'));
    });
    return;
  }
  if (url === '/ping'){
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end('{"ok":true}');
    return;
  }
  res.writeHead(404); res.end();
});

const io = new Server(server, { cors: { origin: PLAY_ORIGINS }, maxHttpBufferSize: 4e6, pingInterval: 5000, pingTimeout: 10000 });
const MAX_PLAYERS = 6;
const rooms = new Map();   // 방 id → { id, name, players: Map(socket id → 이름), started }
let tick = 0;
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
function roomList(){
  return [...rooms.values()].map(r => ({ id: r.id, name: r.name, host: [...r.players.values()][0] || '', count: r.players.size, max: MAX_PLAYERS, started: r.started }));
}
const pushRooms = () => io.to('lobby').emit('rooms', roomList());
function leaveRoom(socket){
  const r = rooms.get(socket.data.room);
  socket.leave('r:' + socket.data.room);
  if (r){
    r.players.delete(socket.id);
    socket.to('r:' + r.id).emit('msg', { t: 'bye', from: socket.data.id });
    if (!r.players.size) rooms.delete(r.id);
  }
  socket.data.room = null;
}
function enter(socket, r, d, ack){
  if (!r.players.has(socket.id) && r.players.size >= MAX_PLAYERS) return ack({ ok: false, reason: `방이 가득 찼어요 (${MAX_PLAYERS}명)` });
  if (socket.data.room && socket.data.room !== r.id) leaveRoom(socket);
  socket.data.room = r.id; socket.data.id = clean(d.id, 16);
  r.players.set(socket.id, clean(d.player, 12) || '작업자');
  socket.leave('lobby'); socket.join('r:' + r.id);
  // 들어온 순번(서버 시각 기준) — 방장은 순번이 가장 빠른 사람. 다시 연결돼도 처음 순번을 쓴다
  if (!socket.data.seq) socket.data.seq = Date.now() * 100 + (tick++ % 100);
  ack({ ok: true, seq: socket.data.seq, now: Date.now(), room: { id: r.id, name: r.name } });
  pushRooms();
}
io.on('connection', socket => {
  socket.join('lobby');
  socket.on('list', ack => typeof ack === 'function' && ack(roomList()));
  socket.on('create', (d, ack) => {
    if (typeof ack !== 'function') return;
    d = d || {};
    let id;
    do id = Math.random().toString(36).slice(2, 8); while (rooms.has(id));
    const r = { id, name: clean(d.name, 24) || '철거 현장', players: new Map(), started: false };
    rooms.set(id, r);
    enter(socket, r, d, ack);
  });
  socket.on('join', (d, ack) => {
    if (typeof ack !== 'function') return;
    d = d || {};
    let r = rooms.get(clean(d.room, 16));
    // 서버가 잠깐 끊겼다 다시 붙었는데 방이 사라졌으면 같은 방을 다시 만든다
    if (!r && d.rejoin){ r = { id: clean(d.room, 16), name: clean(d.name, 24) || '철거 현장', players: new Map(), started: true }; rooms.set(r.id, r); }
    if (!r) return ack({ ok: false, reason: '없어진 방이에요' });
    enter(socket, r, d, ack);
  });
  socket.on('started', () => { const r = rooms.get(socket.data.room); if (r){ r.started = true; pushRooms(); } });
  socket.on('msg', m => { if (socket.data.room) socket.to('r:' + socket.data.room).emit('msg', m); });
  socket.on('disconnect', () => { if (socket.data.room){ leaveRoom(socket); pushRooms(); } });
});

server.listen(PORT, () => console.log(`철거반 중계 서버 실행 중 (포트 ${PORT}) — http://localhost:${PORT}`));
