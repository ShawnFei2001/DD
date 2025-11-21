const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let gameState = {
  status: 'idle', // idle, drawing, revealed
  prizeName: '',
  participants: [],
  winner: null,
  targetTime: null,
};

let autoDrawTimer = null;

io.on('connection', (socket) => {
  // 客户端连接时发送当前状态
  socket.emit('updateState', gameState);

  // 管理员更新设置
  socket.on('admin-update-config', (config) => {
    gameState = { ...gameState, ...config };
    
    // 处理自动倒计时逻辑
    if (autoDrawTimer) clearTimeout(autoDrawTimer);
    if (gameState.targetTime) {
      const delay = new Date(gameState.targetTime).getTime() - new Date().getTime();
      if (delay > 0) {
        console.log(`Server: Timer set for ${delay}ms`);
        autoDrawTimer = setTimeout(() => startLottery(), delay);
      }
    }
    io.emit('updateState', gameState);
  });

  // 管理员手动开始
  socket.on('admin-start-draw', () => startLottery());

  // 重置
  socket.on('admin-reset', () => {
    if (autoDrawTimer) clearTimeout(autoDrawTimer);
    gameState.status = 'idle';
    gameState.winner = null;
    gameState.targetTime = null;
    io.emit('updateState', gameState);
  });
});

function startLottery() {
  if (gameState.participants.length === 0 || gameState.status === 'drawing') return;
  
  gameState.status = 'drawing';
  gameState.winner = null;
  io.emit('updateState', gameState);

  // 动画持续 4 秒后出结果
  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * gameState.participants.length);
    gameState.winner = gameState.participants[randomIndex];
    gameState.status = 'revealed';
    io.emit('updateState', gameState);
  }, 4000);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
