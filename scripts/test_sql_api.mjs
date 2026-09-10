import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const url = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const ref = url.replace('https://', '').split('.')[0];
console.log('Project ref:', ref);

async function testSql() {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT 1;' }),
    });
    console.log('Management API status:', res.status, await res.text());
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

testSql();
