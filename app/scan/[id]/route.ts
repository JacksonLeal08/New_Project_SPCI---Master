import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = (id || '').trim();

  if (!cleanId) {
    return NextResponse.redirect(new URL('/public/ativos', request.url), 307);
  }

  // 1. Detectar se há sessão técnica ativa via Cookie do Supabase ou Header Authorization
  const authHeader = request.headers.get('Authorization');
  let hasSession = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    hasSession = true;
  } else {
    // Procura por cookies de autenticação do Supabase (sb-*-auth-token)
    const cookies = request.cookies.getAll();
    const supabaseAuthCookie = cookies.find(
      (c) =>
        c.name.includes('-auth-token') ||
        c.name.startsWith('sb-') ||
        c.name === 'supabase-auth-token' ||
        c.name === 'spci_session' ||
        c.name === 'spci_session_token'
    );

    if (supabaseAuthCookie && supabaseAuthCookie.value) {
      try {
        // Validação da presença de sessão no cookie
        const parsed = JSON.parse(decodeURIComponent(supabaseAuthCookie.value));
        if (parsed && (parsed.access_token || (Array.isArray(parsed) && parsed[0]))) {
          hasSession = true;
        }
      } catch {
        // Se for token em texto simples
        if (supabaseAuthCookie.value.length > 20) {
          hasSession = true;
        }
      }
    }
  }

  // 2. Desvio Inteligente (Smart Routing)
  if (hasSession) {
    // Cenário 1: Técnico de Campo / Brigadista Autenticado -> Leva direto ao checklist NBR
    const inspectionUrl = new URL(`/inspecao/${encodeURIComponent(cleanId)}`, request.url);
    return NextResponse.redirect(inspectionUrl, 307);
  }

  // Cenário 2: Colaborador / Auditor / Câmera de Smartphone comum -> Ficha Técnica Pública Viva
  const publicViewUrl = new URL(`/public/ativo/${encodeURIComponent(cleanId)}`, request.url);
  return NextResponse.redirect(publicViewUrl, 307);
}
