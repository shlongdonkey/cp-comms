const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase, mockDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(authMiddleware);

/**
 * Urgency durations in milliseconds
 */
const URGENCY_DURATION_MS = {
    'now': 0,
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    'today': 24 * 60 * 60 * 1000,
};

/**
 * Format initials with dot: JD → J.D
 */
function formatInitials(input) {
    const clean = input.replace(/[.\s]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    return `${clean[0]}.${clean[1]}`;
}

/**
 * Calculate deadline from creation time and urgency
 */
function calculateDeadline(createdAt, urgency) {
    const created = new Date(createdAt);
    const duration = URGENCY_DURATION_MS[urgency] || 0;
    return new Date(created.getTime() + duration).toISOString();
}

/**
 * GET /api/tasks
 * Get all active tasks (sorted by state then deadline)
 */
router.get('/', async (req, res) => {
    try {
        let tasks = [];

        if (supabase) {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .or('state.neq.completed,and(state.eq.rejected,rejection_expires.gt.now())')
                .order('deadline', { ascending: true });

            if (error) throw error;
            tasks = data || [];
        } else {
            // Filter out completed and expired rejected tasks
            const now = new Date();
            tasks = mockDb.tasks.filter(t => {
                if (t.state === 'completed') return false;
                if (t.state === 'rejected' && new Date(t.rejection_expires) < now) return false;
                return true;
            });
        }

        // Sort by state priority then deadline
        const statePriority = { in_progress: 1, paused: 2, requested: 3, rejected: 4 };
        tasks.sort((a, b) => {
            const stateDiff = statePriority[a.state] - statePriority[b.state];
            if (stateDiff !== 0) return stateDiff;
            return new Date(a.deadline) - new Date(b.deadline);
        });

        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
    try {
        const { signature, description, urgency, category, assigned_to } = req.body;

        // Validate signature (2 letters)
        const cleanSignature = signature.replace(/[.\s]/g, '');
        if (!/^[A-Za-z]{2}$/.test(cleanSignature)) {
            return res.status(400).json({ error: 'Signature must be exactly 2 letters' });
        }

        // Validate urgency
        if (!['now', '15min', '1hour', 'today'].includes(urgency)) {
            return res.status(400).json({ error: 'Invalid urgency value' });
        }

        // Validate category
        const validCategories = ['product', 'pallets', 'carton', 'material', 'label', 'task'];
        if (!category || !validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid or missing category' });
        }

        // Validate description
        if (!description || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description required' });
        }

        const now = new Date().toISOString();
        const task = {
            id: uuidv4(),
            created_by: req.user.userId,
            assigned_to: assigned_to || null,
            state: 'requested',
            category,
            urgency,
            created_at: now,
            deadline: calculateDeadline(now, urgency),
            state_changed_at: now,
            signature: formatInitials(signature),
            description: description.trim(),
            rejection_reason: null,
            rejection_expires: null,
        };

        if (supabase) {
            const { data, error } = await supabase
                .from('tasks')
                .insert(task)
                .select()
                .single();

            if (error) throw error;

            // Broadcast to all clients
            req.app.get('io').emit('task:created', data);
            res.status(201).json(data);
        } else {
            mockDb.tasks.push(task);
            req.app.get('io').emit('task:created', task);
            res.status(201).json(task);
        }
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task', details: error.message });
    }
});

/**
 * PATCH /api/tasks/:id/assign
 * Assign task to a fleet/driver (Store Office only)
 */
router.patch('/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (req.user.role !== 'store_office') {
            return res.status(403).json({ error: 'Only Store Office can assign tasks' });
        }

        const now = new Date().toISOString();

        if (supabase) {
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    assigned_to: userId,
                    state_changed_at: now,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            req.app.get('io').emit('task:updated', data);
            res.json(data);
        } else {
            const taskIndex = mockDb.tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

            mockDb.tasks[taskIndex] = {
                ...mockDb.tasks[taskIndex],
                assigned_to: userId,
                state_changed_at: now,
            };

            req.app.get('io').emit('task:updated', mockDb.tasks[taskIndex]);
            res.json(mockDb.tasks[taskIndex]);
        }
    } catch (error) {
        console.error('Assign task error:', error);
        res.status(500).json({ error: 'Failed to assign task' });
    }
});

/**
 * PATCH /api/tasks/:id/state
 * Update task state (start, pause, resume, complete)
 */
router.patch('/:id/state', async (req, res) => {
    try {
        const { id } = req.params;
        const { state } = req.body;

        const validStates = ['in_progress', 'paused', 'completed'];
        if (!validStates.includes(state)) {
            return res.status(400).json({ error: 'Invalid state' });
        }

        const now = new Date().toISOString();

        if (supabase) {
            // If completing, archive to history
            if (state === 'completed') {
                const { data: task } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (task) {
                    // Archive
                    await supabase.from('task_history').insert({
                        original_task_id: task.id,
                        task_snapshot: task,
                        completed_at: now,
                        delete_after: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
                    });

                    // Delete from active
                    await supabase.from('tasks').delete().eq('id', id);
                    req.app.get('io').emit('task:deleted', id);
                    return res.json({ success: true, archived: true });
                }
            }

            const { data, error } = await supabase
                .from('tasks')
                .update({
                    state,
                    state_changed_at: now,
                    assigned_to: state === 'in_progress' ? req.user.userId : undefined,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            req.app.get('io').emit('task:updated', data);
            res.json(data);
        } else {
            const taskIndex = mockDb.tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) {
                return res.status(404).json({ error: 'Task not found' });
            }

            if (state === 'completed') {
                const task = mockDb.tasks[taskIndex];
                mockDb.task_history.push({
                    id: uuidv4(),
                    original_task_id: task.id,
                    task_snapshot: { ...task },
                    completed_at: now,
                    delete_after: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                });
                mockDb.tasks.splice(taskIndex, 1);
                req.app.get('io').emit('task:deleted', id);
                return res.json({ success: true, archived: true });
            }

            mockDb.tasks[taskIndex] = {
                ...mockDb.tasks[taskIndex],
                state,
                state_changed_at: now,
                assigned_to: state === 'in_progress' ? req.user.userId : mockDb.tasks[taskIndex].assigned_to,
            };

            req.app.get('io').emit('task:updated', mockDb.tasks[taskIndex]);
            res.json(mockDb.tasks[taskIndex]);
        }
    } catch (error) {
        console.error('Update task state error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/**
 * POST /api/tasks/:id/reject
 * Reject a task (Store Office only)
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Only store_office can reject
        if (req.user.role !== 'store_office') {
            return res.status(403).json({ error: 'Only Store Office can reject tasks' });
        }

        // Validate reason
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'Rejection reason required' });
        }

        if (reason.length > 150) {
            return res.status(400).json({ error: 'Reason must be 150 characters or less' });
        }

        const now = new Date();
        const rejectionExpires = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

        if (supabase) {
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    state: 'rejected',
                    state_changed_at: now.toISOString(),
                    rejection_reason: reason.trim(),
                    rejection_expires: rejectionExpires,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            req.app.get('io').emit('task:updated', data);
            res.json(data);
        } else {
            const taskIndex = mockDb.tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) {
                return res.status(404).json({ error: 'Task not found' });
            }

            mockDb.tasks[taskIndex] = {
                ...mockDb.tasks[taskIndex],
                state: 'rejected',
                state_changed_at: now.toISOString(),
                rejection_reason: reason.trim(),
                rejection_expires: rejectionExpires,
            };

            req.app.get('io').emit('task:updated', mockDb.tasks[taskIndex]);
            res.json(mockDb.tasks[taskIndex]);
        }
    } catch (error) {
        console.error('Reject task error:', error);
        res.status(500).json({ error: 'Failed to reject task' });
    }
});

/**
 * GET /api/tasks/history
 * Get completed task history
 */
router.get('/history', async (req, res) => {
    try {
        const { month, year } = req.query;

        if (supabase) {
            let query = supabase
                .from('task_history')
                .select('*')
                .order('completed_at', { ascending: false });

            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                query = query
                    .gte('completed_at', startDate.toISOString())
                    .lte('completed_at', endDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            res.json(data || []);
        } else {
            let history = [...mockDb.task_history];

            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                history = history.filter(h => {
                    const d = new Date(h.completed_at);
                    return d >= startDate && d <= endDate;
                });
            }

            history.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
            res.json(history);
        }
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
