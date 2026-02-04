const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: '.env.local' });

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const messageRoutes = require('./routes/messages');

// Import socket handlers
const { setupSocketHandlers } = require('./socket/handlers');

// Import cron jobs
require('./cron/purgeMessages');
require('./cron/archiveTasks');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 CP Comms Server running on port ${PORT}`);
    console.log(`📡 WebSocket ready for connections`);
});

module.exports = { app, server, io };
