const { socketAuthMiddleware } = require('../middleware/auth');

/**
 * Track typing users per channel
 */
const typingUsers = {
    global_chat: new Map(), // userId => timeout
    admin_ops: new Map(),
};

/**
 * Setup Socket.io event handlers
 */
function setupSocketHandlers(io) {
    // Apply auth middleware
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const userId = socket.user.userId;
        const userRole = socket.user.role;

        console.log(`✅ User connected: ${userId} (${userRole})`);

        // Subscribe to task updates (all authenticated users)
        socket.on('task:subscribe', () => {
            socket.join('tasks');
            console.log(`📋 User ${userId} subscribed to tasks`);
        });

        // Join chat channel (with role-based access)
        socket.on('chat:join', (channel) => {
            const allowedRoles = {
                'global_chat': ['office', 'factory_office', 'store_office', 'factory', 'driver_crown', 'driver_electric'],
                'admin_ops': ['office', 'factory_office', 'store_office'],
            };

            if (!allowedRoles[channel]?.includes(userRole)) {
                socket.emit('error', { message: 'Access denied to channel' });
                return;
            }

            socket.join(channel);
            console.log(`💬 User ${userId} joined ${channel}`);
        });

        // Leave chat channel
        socket.on('chat:leave', (channel) => {
            socket.leave(channel);
            clearTypingTimeout(channel, userId);
            console.log(`👋 User ${userId} left ${channel}`);
        });

        // Typing indicator
        socket.on('chat:typing', (channel) => {
            if (!typingUsers[channel]) return;

            // Clear existing timeout
            clearTypingTimeout(channel, userId);

            // Set user as typing
            typingUsers[channel].set(userId, setTimeout(() => {
                typingUsers[channel].delete(userId);
                broadcastTyping(io, channel);
            }, 3000)); // Clear after 3s of no activity

            broadcastTyping(io, channel);
        });

        // Read receipt
        socket.on('chat:read', (messageId) => {
            // This is handled by the REST API, just broadcast
        });

        // Disconnect
        socket.on('disconnect', () => {
            // Clear typing indicators
            Object.keys(typingUsers).forEach(channel => {
                clearTypingTimeout(channel, userId);
                broadcastTyping(io, channel);
            });

            console.log(`❌ User disconnected: ${userId}`);
        });
    });
}

/**
 * Clear typing timeout for a user
 */
function clearTypingTimeout(channel, userId) {
    if (typingUsers[channel]?.has(userId)) {
        clearTimeout(typingUsers[channel].get(userId));
        typingUsers[channel].delete(userId);
    }
}

/**
 * Broadcast current typing users to channel
 */
function broadcastTyping(io, channel) {
    const userIds = Array.from(typingUsers[channel]?.keys() || []);
    io.to(channel).emit('user:typing', { channel, userIds });
}

module.exports = { setupSocketHandlers };
