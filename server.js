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

// 初始状态
let gameState = {
  status: 'idle', // idle, drawing, revealed
  prizeName: '',
  participants: [],
  winner: null,
  endTime: null, // 用于倒计时
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 客户端连入时，发送当前最新状态
  socket.emit('updateState', gameState);

  // 管理员：更新设置
  socket.on('admin-update-config', (config) => {
    gameState = { ...gameState, ...config };
    io.emit('updateState', gameState);
  });

  // 管理员：开始抽奖
  socket.on('admin-start-draw', () => {
    if (gameState.participants.length === 0) return;
    
    gameState.status = 'drawing';
    gameState.winner = null;
    io.emit('updateState', gameState);

    // 模拟抽奖过程：3.5秒后出结果
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * gameState.participants.length);
      gameState.winner = gameState.participants[randomIndex];
      gameState.status = 'revealed';
      io.emit('updateState', gameState);
    }, 3500);
  });

  // 管理员：重置
  socket.on('admin-reset', () => {
    gameState.status = 'idle';
    gameState.winner = null;
    io.emit('updateState', gameState);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
