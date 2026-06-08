import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdvbcxbvtervzecyhvax.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJjeGJ2dGVydnplY3lodmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDEzNTYsImV4cCI6MjA5NjAxNzM1Nn0.p2DsRnH9-YXva6-Wg4CTDYQIxMsuhjQQDNYzz2WlEPk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- Checking activos_extintores ---');
  try {
    const { data, error } = await supabase
      .from('ativos_extintores')
      .select('*')
      .limit(1);

    if (error) {
      console.log('ativos_extintores error:', error);
    } else {
      console.log('ativos_extintores columns:', Object.keys(data[0] || {}));
      console.log('ativos_extintores row:', data[0]);
    }
  } catch (err) {
    console.error('Fatal in activos_extintores:', err);
  }

  console.log('\n--- Checking vw_extintores_publico ---');
  try {
    const { data, error } = await supabase
      .from('vw_extintores_publico')
      .select('*')
      .limit(1);

    if (error) {
      console.log('vw_extintores_publico error:', error);
    } else {
      console.log('vw_extintores_publico columns:', Object.keys(data[0] || {}));
      console.log('vw_extintores_publico row:', data[0]);
    }
  } catch (err) {
    console.error('Fatal in vw_extintores_publico:', err);
  }

  console.log('\n--- Attempting dummy upsert in ativos_extintores ---');
  try {
    const payload = {
      local_id: 1, // Let's hope ID 1 exists or similar
      numero_patrimonio: 'EXT-TEST-DUMMY',
      selo_inmetro: '12345678',
      chassi: '12345',
      modelo_id: 1,
      peso_capacidade: '6KG',
      data_ultima_recarga: '2026-06-01',
      meses_validade_recarga: 12,
      ano_ultimo_teste_hidro: 2026,
      ano_fabricacao: 2024,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('ativos_extintores')
      .upsert(payload, { onConflict: 'numero_patrimonio' })
      .select();

    if (error) {
      console.log('Upsert error:', error);
    } else {
      console.log('Upsert success:', data);
      
      // Clean up
      await supabase.from('ativos_extintores').delete().eq('numero_patrimonio', 'EXT-TEST-DUMMY');
    }
  } catch (err) {
    console.error('Fatal in upsert:', err);
  }
}

runTest();
