// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 允许跨域连接
    methods: ["GET", "POST"]
  }
});

let gameState = {
  status: 'idle', 
  prizeName: '',
  participants: [],
  winner: null,
  targetTime: null, // 新增：目标开奖时间
};

let autoDrawTimer = null;

io.on('connection', (socket) => {
  socket.emit('updateState', gameState);

  // 管理员更新配置
  socket.on('admin-update-config', (config) => {
    // 合并配置
    gameState = { ...gameState, ...config };
    
    // 如果设置了时间，且时间在未来，则设置服务端自动定时器
    if (gameState.targetTime) {
      const delay = new Date(gameState.targetTime).getTime() - new Date().getTime();
      
      // 清除旧的定时器
      if (autoDrawTimer) clearTimeout(autoDrawTimer);

      if (delay > 0) {
        console.log(`自动开奖已设定，将在 ${delay / 1000} 秒后触发`);
        autoDrawTimer = setTimeout(() => {
          startLottery();
        }, delay);
      }
    }

    io.emit('updateState', gameState);
  });

  // 管理员手动触发
  socket.on('admin-start-draw', () => {
    startLottery();
  });

  socket.on('admin-reset', () => {
    if (autoDrawTimer) clearTimeout(autoDrawTimer);
    gameState.status = 'idle';
    gameState.winner = null;
    gameState.targetTime = null; // 重置时间
    io.emit('updateState', gameState);
  });
});

// 抽公用函数
function startLottery() {
  if (gameState.participants.length === 0 || gameState.status === 'drawing') return;
  
  console.log("开始抽奖...");
  gameState.status = 'drawing';
  gameState.winner = null;
  io.emit('updateState', gameState);

  // 3.5秒动画后出结果
  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * gameState.participants.length);
    gameState.winner = gameState.participants[randomIndex];
    gameState.status = 'revealed';
    io.emit('updateState', gameState);
  }, 3500);
}


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
