const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Express middleware to verify JWT token from cookie
 */
function authMiddleware(req, res, next) {
    const token = req.cookies.session;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired' });
        }
        return res.status(401).json({ error: 'Invalid session' });
    }
}

/**
 * Socket.io middleware to verify JWT token from cookie
 */
function socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie?.match(/session=([^;]+)/)?.[1];

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error('Invalid session'));
    }
}

module.exports = { authMiddleware, socketAuthMiddleware };
