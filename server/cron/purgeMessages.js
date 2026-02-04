const cron = require('node-cron');
const { supabase, mockDb } = require('../db');

/**
 * Purge messages older than 14 days
 * Runs every hour at minute 0
 */
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running message purge job...');

    try {
        const now = new Date();

        if (supabase) {
            const { data, error } = await supabase
                .from('messages')
                .delete()
                .lt('delete_after', now.toISOString())
                .select('id');

            if (error) throw error;
            console.log(`[CRON] Purged ${data?.length || 0} expired messages`);
        } else {
            // Mock DB purge
            const before = mockDb.messages.length;
            mockDb.messages = mockDb.messages.filter(
                m => new Date(m.delete_after) > now
            );
            const purged = before - mockDb.messages.length;
            console.log(`[CRON] Purged ${purged} expired messages (mock)`);
        }
    } catch (error) {
        console.error('[CRON] Message purge failed:', error);
    }
});

/**
 * Also purge expired rejected tasks (1 hour after rejection)
 * Runs alongside message purge
 */
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running rejected task cleanup...');

    try {
        const now = new Date();

        if (supabase) {
            const { data, error } = await supabase
                .from('tasks')
                .delete()
                .eq('state', 'rejected')
                .lt('rejection_expires', now.toISOString())
                .select('id');

            if (error) throw error;
            console.log(`[CRON] Cleaned up ${data?.length || 0} expired rejected tasks`);
        } else {
            const before = mockDb.tasks.length;
            mockDb.tasks = mockDb.tasks.filter(
                t => t.state !== 'rejected' || new Date(t.rejection_expires) > now
            );
            const cleaned = before - mockDb.tasks.length;
            console.log(`[CRON] Cleaned up ${cleaned} expired rejected tasks (mock)`);
        }
    } catch (error) {
        console.error('[CRON] Rejected task cleanup failed:', error);
    }
});

console.log('📅 Message purge cron job scheduled (hourly)');
console.log('📅 Rejected task cleanup cron job scheduled (hourly)');
