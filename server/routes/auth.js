const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase, mockDb } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_DURATION_MS = 9 * 60 * 60 * 1000; // 9 hours

/**
 * POST /api/auth/verify-pin
 * Verify PIN for protected access points
 */
router.post('/verify-pin', async (req, res) => {
    try {
        const { role, pin } = req.body;

        if (!role || !pin) {
            return res.status(400).json({ error: 'Role and PIN required' });
        }

        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({ error: 'PIN must be 4 digits' });
        }

        let user = null;

        if (supabase) {
            // Production: Query Supabase
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', role);

            if (error) throw error;

            for (const u of users || []) {
                if (u.pin_hash && await bcrypt.compare(pin, u.pin_hash)) {
                    user = u;
                    break;
                }
            }
        } else {
            // Development: Use mock DB
            // Default PIN for dev: 1234
            const mockUser = mockDb.users.find(u => u.role === role);
            if (mockUser && pin === '1234') {
                user = mockUser;
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Create session token
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '9h' }
        );

        // Store session
        if (supabase) {
            await supabase.from('sessions').insert({
                user_id: user.id,
                token,
                expires_at: expiresAt.toISOString(),
            });
        } else {
            mockDb.sessions.push({
                id: Date.now().toString(),
                user_id: user.id,
                token,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString(),
            });
        }

        // Set HTTP-only cookie
        res.cookie('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiresAt,
        });

        // Return user data (without pin_hash)
        const { pin_hash, ...safeUser } = user;
        res.json({
            user: safeUser,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * GET /api/auth/session
 * Validate current session
 */
router.get('/session', async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.status(401).json({ error: 'No session' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user
        let user = null;
        if (supabase) {
            const { data } = await supabase
                .from('users')
                .select('id, role, display_name, created_at')
                .eq('id', decoded.userId)
                .single();
            user = data;
        } else {
            user = mockDb.users.find(u => u.id === decoded.userId);
            if (user) {
                const { pin_hash, ...safeUser } = user;
                user = safeUser;
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired' });
        }
        console.error('Session check error:', error);
        res.status(401).json({ error: 'Invalid session' });
    }
});

/**
 * POST /api/auth/logout
 * Clear session
 */
router.post('/logout', async (req, res) => {
    const token = req.cookies.session;

    if (token && supabase) {
        await supabase.from('sessions').delete().eq('token', token);
    }

    res.clearCookie('session');
    res.json({ success: true });
});

/**
 * POST /api/auth/reset-pin
 * Reset PIN (requires current PIN)
 */
router.post('/reset-pin', async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        const token = req.cookies.session;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'New PIN must be 4 digits' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify current PIN
        let user = null;
        if (supabase) {
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();
            user = data;
        } else {
            user = mockDb.users.find(u => u.id === decoded.userId);
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check current PIN
        const pinValid = supabase
            ? await bcrypt.compare(currentPin, user.pin_hash)
            : currentPin === '1234';

        if (!pinValid) {
            return res.status(401).json({ error: 'Current PIN incorrect' });
        }

        // Hash new PIN
        const newHash = await bcrypt.hash(newPin, 10);

        // Update PIN
        if (supabase) {
            await supabase
                .from('users')
                .update({ pin_hash: newHash })
                .eq('id', user.id);
        } else {
            const userIndex = mockDb.users.findIndex(u => u.id === user.id);
            mockDb.users[userIndex].pin_hash = newHash;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('PIN reset error:', error);
        res.status(500).json({ error: 'Failed to reset PIN' });
    }
});

module.exports = router;
