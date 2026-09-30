const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Geoalertasap@db.leljlonneasozzcwhntj.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB');
    
    // Check and add status column
    await client.query(`
      ALTER TABLE occurrences 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Novo';
    `);
    
    // Check and add assigned_to column
    await client.query(`
      ALTER TABLE occurrences 
      ADD COLUMN IF NOT EXISTS assigned_to TEXT;
    `);

    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
