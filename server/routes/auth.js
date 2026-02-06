const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase, mockDb } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

if (JWT_SECRET === 'dev-secret-change-in-production') {
    console.warn('⚠️ WARNING: Using default JWT secret. Check .env.local loading.');
} else {
    console.log('✅ JWT Secret loaded successfully (first 4 chars):', JWT_SECRET.substring(0, 4) + '...');
}

const SESSION_DURATION_MS = 9 * 60 * 60 * 1000; // 9 hours

/**
 * POST /api/auth/verify-pin
 * Verify PIN for protected access points
 * Supports plain-text PIN comparison and 'NONE' for auto-bypass
 */
router.post('/verify-pin', async (req, res) => {
    try {
        const { role, pin } = req.body;

        if (!role) {
            return res.status(400).json({ error: 'Role required' });
        }

        let user = null;

        if (supabase) {
            // Production: Query Supabase users table
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', role);

            if (error) throw error;

            for (const u of users || []) {
                // Handle 'NONE' PIN - auto-bypass (no PIN required)
                if (u.pin === 'NONE') {
                    user = u;
                    break;
                }
                // Plain-text PIN comparison
                if (u.pin && u.pin === pin) {
                    user = u;
                    break;
                }
            }
        } else {
            // Development: Use mock DB with default PIN 1234
            const mockUser = mockDb.users.find(u => u.role === role);
            if (mockUser) {
                // Mock: Support 'NONE' PIN or match '1234'
                if (mockUser.pin === 'NONE' || pin === '1234') {
                    user = mockUser;
                }
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
        res.cookie('cp-comms-session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/', // Ensure cookie is available for all routes
            expires: expiresAt,
        });

        // Return user data (without pin)
        const { pin: userPin, pin_hash, ...safeUser } = user;
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
 * GET /api/auth/check-role/:role
 * Check if a role requires PIN entry or has auto-bypass (PIN = 'NONE')
 */
router.get('/check-role/:role', async (req, res) => {
    try {
        const { role } = req.params;

        if (!role) {
            return res.status(400).json({ error: 'Role required' });
        }

        let requiresPin = true;

        if (supabase) {
            // Check Supabase users table
            const { data: users, error } = await supabase
                .from('users')
                .select('pin')
                .eq('role', role)
                .limit(1);

            if (error) throw error;

            if (users && users.length > 0) {
                requiresPin = users[0].pin !== 'NONE';
            }
        } else {
            // Mock DB: Factory and drivers have 'NONE' PIN in dev
            const bypassRoles = ['factory', 'driver_crown', 'driver_electric'];
            requiresPin = !bypassRoles.includes(role);
        }

        res.json({ role, requiresPin });
    } catch (error) {
        console.error('Check role error:', error);
        res.status(500).json({ error: 'Failed to check role' });
    }
});

/**
 * GET /api/auth/session
 * Validate current session
 */
router.get('/session', async (req, res) => {
    try {
        const token = req.cookies['cp-comms-session'];

        if (!token) {
            console.log('[SESSION DEBUG] No token found in cookies');
            return res.status(401).json({ error: 'No session' });
        }

        // Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.log('[SESSION DEBUG] JWT verification failed:', err.message);
            return res.status(401).json({ error: 'Invalid session' });
        }

        console.log('[SESSION DEBUG] Decoded token:', JSON.stringify(decoded));

        // Get user
        let user = null;
        if (supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('id, role, display_name, created_at')
                .eq('id', decoded.userId)
                .single();

            if (error) {
                console.log('[SESSION DEBUG] Supabase user lookup error:', error.message);
            }
            user = data;
        } else {
            user = mockDb.users.find(u => u.id === decoded.userId);
            if (user) {
                const { pin_hash, ...safeUser } = user;
                user = safeUser;
            }
        }

        if (!user) {
            console.log('[SESSION DEBUG] User not found for ID:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired' });
        }
        console.error('[SESSION DEBUG] Unexpected error:', error);
        res.status(401).json({ error: 'Invalid session' });
    }
});

/**
 * POST /api/auth/logout
 * Clear session
 */
router.post('/logout', async (req, res) => {
    const token = req.cookies['cp-comms-session'];

    if (token && supabase) {
        await supabase.from('sessions').delete().eq('token', token);
    }

    res.clearCookie('cp-comms-session');
    res.json({ success: true });
});

/**
 * POST /api/auth/reset-pin
 * Reset PIN (requires current PIN)
 */
router.post('/reset-pin', async (req, res) => {
    try {
        const { currentPin, newPin } = req.body;
        const token = req.cookies['cp-comms-session'];

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
