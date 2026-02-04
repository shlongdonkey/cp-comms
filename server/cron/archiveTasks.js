const cron = require('node-cron');
const { supabase, mockDb } = require('../db');

/**
 * Purge archived tasks older than 6 months
 * Runs daily at 3:00 AM
 */
cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Running task archive cleanup...');

    try {
        const now = new Date();

        if (supabase) {
            const { data, error } = await supabase
                .from('task_history')
                .delete()
                .lt('delete_after', now.toISOString())
                .select('id');

            if (error) throw error;
            console.log(`[CRON] Deleted ${data?.length || 0} archived tasks older than 6 months`);
        } else {
            // Mock DB cleanup
            const before = mockDb.task_history.length;
            mockDb.task_history = mockDb.task_history.filter(
                h => new Date(h.delete_after) > now
            );
            const deleted = before - mockDb.task_history.length;
            console.log(`[CRON] Deleted ${deleted} archived tasks older than 6 months (mock)`);
        }
    } catch (error) {
        console.error('[CRON] Task archive cleanup failed:', error);
    }
});

console.log('📅 Task archive cleanup cron job scheduled (daily at 3 AM)');
