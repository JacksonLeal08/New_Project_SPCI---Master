import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const getEnv = (key) => envContent.match(new RegExp(key + '=([^\\r\\n]+)'))[1].trim().replace(/['"]/g, '');

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function recreateUsers() {
  console.log('=== RECRIANDO USUÁRIOS LIMPOS NO SUPABASE AUTH ===\n');

  // 1. Limpar usuário temporário de teste se existir
  try {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const tempUser = list?.users?.find(u => u.email === 'teste_novo_user@gmail.com');
    if (tempUser) {
      await supabaseAdmin.auth.admin.deleteUser(tempUser.id);
      console.log('✓ Usuário temporário de teste removido.');
    }
  } catch (e) {
    // se falhar listUsers por causa dos corrompidos, ignora
  }

  // 2. Criar Jackson Leal
  console.log('\nCriando Jackson Leal (9b1cec31-dda0-44c3-b2fa-602cc4077874)...');
  const { data: u1, error: err1 } = await supabaseAdmin.auth.admin.createUser({
    id: '9b1cec31-dda0-44c3-b2fa-602cc4077874',
    email: 'jacksonflr@outlook.com.br',
    password: 'JimP798621#',
    email_confirm: true,
    user_metadata: {
      full_name: 'Jackson Leal',
      user_name: 'jfleal',
      perfil_acesso: 'Desenvolvedor'
    }
  });

  if (err1) {
    console.error('❌ Erro ao criar Jackson Leal:', err1.message);
  } else {
    console.log('✓ Jackson Leal criado com sucesso:', u1.user.id);
  }

  // 3. Criar Franck Leal / Administrador
  console.log('\nCriando Administrador (98af6368-c5fe-41fe-aa68-ec2d221f4bc6)...');
  const { data: u2, error: err2 } = await supabaseAdmin.auth.admin.createUser({
    id: '98af6368-c5fe-41fe-aa68-ec2d221f4bc6',
    email: 'jackson602@gmail.com',
    password: 'JimP798621#',
    email_confirm: true,
    user_metadata: {
      site: 'SALOBO',
      full_name: 'Usuário Teste',
      user_name: 'franckleal',
      perfil_acesso: 'Administrador'
    }
  });

  if (err2) {
    console.error('❌ Erro ao criar Usuário Administrador:', err2.message);
  } else {
    console.log('✓ Administrador criado com sucesso:', u2.user.id);
  }

  // 4. Testar Login com Jackson Leal
  console.log('\n--- TESTANDO LOGIN CLIENTE COM JACKSON LEAL ---');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'jacksonflr@outlook.com.br',
    password: 'JimP798621#'
  });

  if (loginErr) {
    console.error('❌ Falha no login:', loginErr);
  } else {
    console.log('🎉 SUCESSO TOTAL NO LOGIN! Usuário logado:', loginData.user?.email);
    console.log('Token JWT emitido com sucesso.');
  }
}

recreateUsers();
