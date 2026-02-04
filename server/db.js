const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not configured. Using mock database.');
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Mock database for development without Supabase
const mockDb = {
    users: [
        { id: '1', role: 'office', display_name: 'Office Admin', pin_hash: '$2b$10$example' },
        { id: '2', role: 'factory_office', display_name: 'Factory Office', pin_hash: '$2b$10$example' },
        { id: '3', role: 'store_office', display_name: 'Store Office', pin_hash: '$2b$10$example' },
        { id: '4', role: 'factory', display_name: 'Factory Floor', pin_hash: null },
        { id: '5', role: 'driver_crown', display_name: 'Crown Driver', pin_hash: null },
        { id: '6', role: 'driver_electric', display_name: 'Electric Driver', pin_hash: null },
    ],
    sessions: [],
    tasks: [],
    task_history: [],
    messages: [],
};

module.exports = { supabase, mockDb };
