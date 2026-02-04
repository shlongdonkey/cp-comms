const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase, mockDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * Channels and their allowed roles
 */
const CHANNEL_ACCESS = {
    'global_chat': ['office', 'factory_office', 'store_office', 'factory', 'driver_crown', 'driver_electric'],
    'admin_ops': ['office', 'factory_office', 'store_office'],
};

/**
 * Check if user can access channel
 */
function canAccessChannel(role, channel) {
    return CHANNEL_ACCESS[channel]?.includes(role) ?? false;
}

/**
 * GET /api/messages/:channel
 * Get messages for a channel
 */
router.get('/:channel', async (req, res) => {
    try {
        const { channel } = req.params;
        const { limit = 50, before } = req.query;

        if (!canAccessChannel(req.user.role, channel)) {
            return res.status(403).json({ error: 'Access denied to this channel' });
        }

        let messages = [];

        if (supabase) {
            let query = supabase
                .from('messages')
                .select(`
          *,
          sender:users(id, role, display_name)
        `)
                .eq('channel', channel)
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (before) {
                query = query.lt('created_at', before);
            }

            const { data, error } = await query;
            if (error) throw error;

            messages = (data || []).reverse();
        } else {
            messages = mockDb.messages
                .filter(m => m.channel === channel)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .slice(-parseInt(limit));

            // Attach sender info
            messages = messages.map(m => ({
                ...m,
                sender: mockDb.users.find(u => u.id === m.sender_id),
            }));
        }

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/messages
 * Send a new message
 */
router.post('/', async (req, res) => {
    try {
        const { channel, content, media_urls = [], voice_url, reply_to } = req.body;

        if (!canAccessChannel(req.user.role, channel)) {
            return res.status(403).json({ error: 'Access denied to this channel' });
        }

        // Must have content OR media OR voice
        if (!content && media_urls.length === 0 && !voice_url) {
            return res.status(400).json({ error: 'Message must have content, media, or voice' });
        }

        // Max 3 attachments
        if (media_urls.length > 3) {
            return res.status(400).json({ error: 'Maximum 3 attachments allowed' });
        }

        const now = new Date();
        const deleteAfter = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

        const message = {
            id: uuidv4(),
            sender_id: req.user.userId,
            channel,
            content: content?.trim() || null,
            media_urls,
            voice_url: voice_url || null,
            reply_to: reply_to || null,
            read_receipts: {},
            created_at: now.toISOString(),
            delete_after: deleteAfter.toISOString(),
        };

        if (supabase) {
            const { data, error } = await supabase
                .from('messages')
                .insert(message)
                .select(`
          *,
          sender:users(id, role, display_name)
        `)
                .single();

            if (error) throw error;

            // Broadcast to channel
            req.app.get('io').to(channel).emit('message:new', data);
            res.status(201).json(data);
        } else {
            const sender = mockDb.users.find(u => u.id === req.user.userId);
            const messageWithSender = { ...message, sender };

            mockDb.messages.push(message);
            req.app.get('io').to(channel).emit('message:new', messageWithSender);
            res.status(201).json(messageWithSender);
        }
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * POST /api/messages/:id/read
 * Mark message as read
 */
router.post('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const now = new Date().toISOString();

        if (supabase) {
            const { data: message } = await supabase
                .from('messages')
                .select('read_receipts, channel')
                .eq('id', id)
                .single();

            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            const updatedReceipts = {
                ...message.read_receipts,
                [userId]: now,
            };

            await supabase
                .from('messages')
                .update({ read_receipts: updatedReceipts })
                .eq('id', id);

            req.app.get('io').to(message.channel).emit('user:read', { userId, messageId: id });
        } else {
            const messageIndex = mockDb.messages.findIndex(m => m.id === id);
            if (messageIndex !== -1) {
                mockDb.messages[messageIndex].read_receipts[userId] = now;
                req.app.get('io').to(mockDb.messages[messageIndex].channel).emit('user:read', { userId, messageId: id });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

/**
 * DELETE /api/messages/:id
 * Delete a message (only sender can delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (supabase) {
            const { data: message } = await supabase
                .from('messages')
                .select('sender_id, channel')
                .eq('id', id)
                .single();

            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            if (message.sender_id !== req.user.userId) {
                return res.status(403).json({ error: 'Can only delete your own messages' });
            }

            await supabase.from('messages').delete().eq('id', id);
            req.app.get('io').to(message.channel).emit('message:deleted', id);
        } else {
            const messageIndex = mockDb.messages.findIndex(m => m.id === id);
            if (messageIndex === -1) {
                return res.status(404).json({ error: 'Message not found' });
            }

            if (mockDb.messages[messageIndex].sender_id !== req.user.userId) {
                return res.status(403).json({ error: 'Can only delete your own messages' });
            }

            const channel = mockDb.messages[messageIndex].channel;
            mockDb.messages.splice(messageIndex, 1);
            req.app.get('io').to(channel).emit('message:deleted', id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
