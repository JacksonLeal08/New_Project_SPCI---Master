import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Testing RPC exec_sql or similar...');
  const sql = `ALTER TABLE assets ADD COLUMN IF NOT EXISTS status_operacional TEXT DEFAULT 'NA_AREA_APLICADO';`;

  // Check possible RPCs
  for (const rpcName of ['exec_sql', 'exec', 'execute_sql', 'run_sql', 'sql']) {
    try {
      const { data, error } = await supabase.rpc(rpcName, { sql, query: sql });
      console.log(`RPC ${rpcName}:`, { data, error });
      if (!error) {
        console.log(`Success with RPC ${rpcName}!`);
        return;
      }
    } catch (e) {
      console.log(`Exception with ${rpcName}:`, e.message);
    }
  }

  console.log('No direct RPC for raw SQL found.');
}

main().catch(console.error);
