import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(key + '=([^\\r\\n]+)'));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://katqbezpcssrmicgnshg.supabase.co';
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGet() {
  const { data, error } = await supabase
    .from('checklists_ativos')
    .select('*')
    .eq('categoria', 'extintores')
    .order('ordem', { ascending: true });

  console.log('Total de quesitos no banco:', data?.length);
  data?.forEach(r => console.log(`- Ordem ${r.ordem}: [${r.id}] ${r.item.substring(0, 45)}...`));
}

testGet().catch(console.error);
