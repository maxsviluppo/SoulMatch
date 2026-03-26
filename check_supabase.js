import pg from 'pg';
const { Client } = pg;

async function checkDb() {
  const connectionString = "postgresql://postgres:1974Max!123@db.kcqeiogrndnifhimrawd.supabase.co:5432/postgres";
  const client = new Client({ connectionString });

  try {
    console.log("Connecting to Supabase PG...");
    await client.connect();
    
    console.log("\n1. Checking site_settings table...");
    const tableCheck = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
      WHERE nspname = 'public' AND relname = 'site_settings'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log("Table 'site_settings' DOES NOT EXIST.");
    } else {
      const isRlsEnabled = tableCheck.rows[0].relrowsecurity;
      console.log(`RLS Enabled: ${isRlsEnabled}`);
    }

    console.log("\n2. Checking Table Permissions...");
    const permCheck = await client.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_name = 'site_settings' AND grantee IN ('anon', 'authenticated', 'service_role')
    `);
    console.table(permCheck.rows);

    console.log("\n3. Current Rows in site_settings:");
    const rows = await client.query("SELECT key, length(value) as val_len FROM site_settings");
    console.table(rows.rows);

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

checkDb();
