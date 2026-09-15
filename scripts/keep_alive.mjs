import fs from 'fs';
import path from 'path';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getEnv = (key) => {
      const m = envContent.match(new RegExp(key + '=([^\\r\\n]+)'));
      return m ? m[1].trim().replace(/['"]/g, '') : null;
    };
    supabaseUrl = supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    supabaseAnonKey = supabaseAnonKey || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

supabaseUrl = supabaseUrl || 'https://katqbezpcssrmicgnshg.supabase.co';
supabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHFiZXpwY3Nzcm1pY2duc2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjUxNjIsImV4cCI6MjEwNTA0MTE2Mn0.9fcuMRiJDARMqHjCQ8IyLIK0YRSk3CmaqmfBKbmFI-Y';

async function pingSupabase() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Iniciando Keep-Alive Ping no Supabase...`);
  console.log(`URL Alvo: ${supabaseUrl}`);

  try {
    // Consulta a tabela pública 'assets' (que possui RLS com leitura pública liberada)
    const targetUrl = `${supabaseUrl}/rest/v1/assets?select=id,id_ativo,category,status&limit=1`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    console.log(`[${timestamp}] ✓ PING COM SUCESSO! Ativo retornado do banco:`, data);
    console.log(`[${timestamp}] ✓ O banco de dados do Supabase está 100% ativo e o contador de 7 dias de inatividade foi zerado!`);
  } catch (err) {
    console.error(`[${timestamp}] ❌ Falha no Keep-Alive Ping:`, err.message);
    process.exit(1);
  }
}

pingSupabase();
