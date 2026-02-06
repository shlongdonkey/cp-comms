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
        { id: '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b', role: 'driver_crown', display_name: 'Crown Fleet', pin_hash: null },
        { id: 'fba7e904-0ed3-4a92-b637-9d64c91354ab', role: 'driver_electric', display_name: 'Electric Fleet', pin_hash: null },
    ],
    sessions: [],
    tasks: [],
    task_history: [],
    messages: [],
};

module.exports = { supabase, mockDb };
