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

const DEFAULT_EXTINTOR_CHECKLIST = [
  {
    id: 'chk-1',
    ordem: 1,
    categoria: 'extintores',
    item: 'Localização, classe e modelo de extintores conforme projeto de incêndio e pânico',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-2',
    ordem: 2,
    categoria: 'extintores',
    item: 'Suporte e Altura de instalação adequada (Máximo 1,60 m do piso acabado)',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Portátil'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-3',
    ordem: 3,
    categoria: 'extintores',
    item: 'Equipamento desobstruído e de fácil acesso visual e físico',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-4',
    ordem: 4,
    categoria: 'extintores',
    item: 'Sinalização de parede visível e dentro da norma vigente NBR 13434',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-5',
    ordem: 5,
    categoria: 'extintores',
    item: 'Sinalização de piso visível e dentro da norma vigente NBR 13434',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-6',
    ordem: 6,
    categoria: 'extintores',
    item: 'Aspecto externo sem dano, amassado, vazamento ou corrosão no recipiente',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: true
  },
  {
    id: 'chk-7',
    ordem: 7,
    categoria: 'extintores',
    item: 'Lacre de segurança íntegro e sem violação',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: true
  },
  {
    id: 'chk-8',
    ordem: 8,
    categoria: 'extintores',
    item: 'Selo Inmetro e Etiquetas de validade/manutenção íntegros e legíveis',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-9',
    ordem: 9,
    categoria: 'extintores',
    item: 'Prazo de manutenção anual e teste hidrostático (5 anos) dentro da validade',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: true
  },
  {
    id: 'chk-10',
    ordem: 10,
    categoria: 'extintores',
    item: 'Prazo de pesagem semestral de CO2 dentro da validade e sem perda >10%',
    tipos_aplicaveis: ['CO2'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: true
  },
  {
    id: 'chk-11',
    ordem: 11,
    categoria: 'extintores',
    item: 'Indicador de pressão (Manômetro) na faixa verde de operação',
    tipos_aplicaveis: ['PQS', 'AP', 'Espuma', 'K'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: true
  },
  {
    id: 'chk-12',
    ordem: 12,
    categoria: 'extintores',
    item: 'Acessórios íntegros (mangueira, difusor, punho, gatilho e válvula)',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-13',
    ordem: 13,
    categoria: 'extintores',
    item: 'Mangueiras de descarga desobstruídas e sem ressecamento',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Todos'],
    status: 'Ativado',
    is_impeditivo: false
  },
  {
    id: 'chk-14',
    ordem: 14,
    categoria: 'extintores',
    item: 'Conjunto de rodagem, mangueira longa e suporte de transporte conforme (Carreta)',
    tipos_aplicaveis: ['Todos'],
    pesos_aplicaveis: ['Carreta / Sobre Rodas'],
    status: 'Ativado',
    is_impeditivo: false
  }
];

async function restoreAll14() {
  console.log('=== RESTAURANDO TODOS OS 14 ITENS NBR NO SUPABASE ===\n');

  // 1. Limpar tabela checklists_ativos
  const { error: delErr } = await supabase
    .from('checklists_ativos')
    .delete()
    .neq('id', '___impossivel___');
  console.log('Limpeza da tabela:', delErr?.message || 'Sucesso');

  // 2. Inserir todos os 14 itens
  const payload = DEFAULT_EXTINTOR_CHECKLIST.map((it, idx) => ({
    id: it.id,
    ordem: idx + 1,
    categoria: 'extintores',
    item: it.item,
    tipos_aplicaveis: it.tipos_aplicaveis,
    pesos_aplicaveis: it.pesos_aplicaveis,
    status: it.status,
    is_impeditivo: it.is_impeditivo,
    updated_at: new Date().toISOString()
  }));

  const { data: insData, error: insErr } = await supabase
    .from('checklists_ativos')
    .insert(payload)
    .select();

  console.log('Inserção:', insData?.length, 'itens inseridos.', insErr?.message || '');

  // 3. Consulta final
  const { data: finalRows } = await supabase
    .from('checklists_ativos')
    .select('*')
    .order('ordem', { ascending: true });

  console.log(`\nTotal em checklists_ativos: ${finalRows?.length}`);
  finalRows.forEach(f => console.log(`[Ordem ${f.ordem}] ${f.id} -> ${f.item.substring(0, 50)}...`));
}

restoreAll14().catch(console.error);
