import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => {
  const m = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
};

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function check() {
  const { data: subLocais } = await supabase.from('sub_locais').select('id, nome, local_id');
  const { data: locais } = await supabase.from('locais').select('id, nome');
  const locaisMap = new Map((locais || []).map(l => [l.id, l.nome]));

  const combinados = (subLocais || []).map(sl => ({
    setor: locaisMap.get(sl.local_id) || 'GERAL',
    sub: sl.nome
  }));

  console.log('Sub-locais existentes:', subLocais?.length);
  console.log('Locais/Setores existentes:', locais?.length);
  console.log('Total de combinações setor + sub-local prontas para a tabela mestre:', combinados.length);
  console.log('Exemplos:', combinados.slice(0, 5));
}

check();
