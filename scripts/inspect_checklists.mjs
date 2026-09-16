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

async function inspectChecklists() {
  const { data, error } = await supabase.from('checklists_ativos').select('*').order('ordem', { ascending: true });
  console.log('Total em checklists_ativos:', data?.length, error?.message || '');
  if (data) {
    data.forEach(d => {
      console.log(`- ID: ${d.id} | Ordem: ${d.ordem} | Status: ${d.status} | Item: ${d.item.substring(0, 40)}...`);
    });
  }
}

inspectChecklists().catch(console.error);
