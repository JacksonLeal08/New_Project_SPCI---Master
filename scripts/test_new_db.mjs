import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, anonKey);

const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('Testando conexão pública e admin com o novo Supabase...');
  
  const { count: cAssets } = await supabaseAdmin.from('assets').select('*', { count: 'exact', head: true });
  const { count: cExtintores } = await supabaseAdmin.from('ativos_extintores').select('*', { count: 'exact', head: true });
  const { count: cUsers } = await supabaseAdmin.from('usuarios').select('*', { count: 'exact', head: true });
  const { count: cLocais } = await supabaseAdmin.from('locais').select('*', { count: 'exact', head: true });
  const { count: cSubLocais } = await supabaseAdmin.from('sub_locais').select('*', { count: 'exact', head: true });
  const { count: cLotes } = await supabaseAdmin.from('lotes_manutencao').select('*', { count: 'exact', head: true });
  const { count: cItensLote } = await supabaseAdmin.from('itens_lote_manutencao').select('*', { count: 'exact', head: true });

  console.log('==================================================');
  console.log('ESTADO DO BANCO NOVO (SPCI Master):');
  console.log(' - Ativos / Equipamentos (assets):', cAssets);
  console.log(' - Ativos Extintores detalhados:', cExtintores);
  console.log(' - Usuários cadastrados:', cUsers);
  console.log(' - Locais:', cLocais);
  console.log(' - Sub-locais:', cSubLocais);
  console.log(' - Lotes de manutenção:', cLotes);
  console.log(' - Itens em lote de manutenção:', cItensLote);
  console.log('==================================================');
}

test();
