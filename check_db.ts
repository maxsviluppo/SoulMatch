import { supabase } from './src/supabase';

async function checkSchema() {
    console.log("Checking tables...");

    const tables = ['post_comments', 'chat_requests', 'users'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error checking table ${table}:`, error.message);
        } else {
            console.log(`Table ${table} is accessible. Columns:`, Object.keys(data[0] || {}).join(', '));
        }
    }
}

checkSchema();
