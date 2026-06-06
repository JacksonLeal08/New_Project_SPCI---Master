import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  const authHeader = request.headers.get('Authorization');

  // -------------------------------------------------------------
  // FINALIDADE B: Requisição autenticada do App Ronda (Técnico Logado)
  // -------------------------------------------------------------
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // Cria cliente Supabase autenticado no contexto do usuário ativo
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Valida o token de sessão do técnico
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sessão técnica inválida ou expirada.' }, 
        { status: 401 }
      );
    }

    // Busca o payload completo de inspeção
    const { data: extintor, error: queryError } = await supabase
      .from('ativos_extintores')
      .select(`
        *,
        local:locais(nome),
        sub_local:sub_locais(nome),
        modelo:modelos_extintores(nome)
      `)
      .eq('qr_code_hash', hash)
      .single();

    if (queryError || !extintor) {
      return NextResponse.json(
        { error: 'Ativo de combate a incêndio não localizado.' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      auth: true,
      action: 'start_inspection',
      payload: extintor
    });
  }

  // -------------------------------------------------------------
  // FINALIDADE A: Leitura pública via Câmera Comum (Sem Token)
  // Redireciona para a página de consulta pública de somente leitura
  // -------------------------------------------------------------
  const publicViewUrl = new URL(`/public/extintores/${hash}`, request.url);
  return NextResponse.redirect(publicViewUrl, 307);
}
