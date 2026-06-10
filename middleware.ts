import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // 1. Definição de rotas públicas e recursos estáticos ignorados pelo middleware
  const isStaticResource = 
    path.startsWith('/_next') || 
    path.startsWith('/api') || 
    path.includes('.') || 
    path === '/favicon.ico';

  if (isStaticResource) {
    return NextResponse.next();
  }

  // Se o parâmetro new_session estiver presente, limpa a sessão ativa para permitir novo login
  const newSessionParam = url.searchParams.get('new_session');
  if (newSessionParam === 'true') {
    url.searchParams.delete('new_session');
    const response = NextResponse.redirect(url);
    response.cookies.delete('spci_session_token');
    response.cookies.delete('spci_user_role');
    response.cookies.delete('spci_user_expires');
    response.cookies.delete('spci_shared_token');
    return response;
  }


  // 2. Leitura dos cookies de sessão e governança corporativa
  const sessionToken = request.cookies.get('spci_session_token')?.value;
  const userRole = request.cookies.get('spci_user_role')?.value;
  const userExpires = request.cookies.get('spci_user_expires')?.value;

  // 3. Captura e validação de token compartilhado (Ronda de Campo)
  const sharedTokenParam = url.searchParams.get('token');
  const sharedTokenCookie = request.cookies.get('spci_shared_token')?.value;

  // Se estiver acessando rotas de inspeção técnica
  if (path.startsWith('/inspecao')) {
    // Caso 1: Usuário já possui login corporativo tradicional ativo, permitir acesso imediato
    if (sessionToken) {
      return NextResponse.next();
    }

    // Caso 2: Um novo token compartilhado foi fornecido via query (?token=UUID)
    if (sharedTokenParam) {
      const isValid = await validateSharedToken(sharedTokenParam);
      if (isValid) {
        // Redireciona para limpar o token da URL no browser e salvar no cookie
        url.searchParams.delete('token');
        const response = NextResponse.redirect(url);

        // Define a expiração do cookie para a meia-noite (23:59:59)
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);
        const maxAge = Math.floor((midnight.getTime() - now.getTime()) / 1000);

        response.cookies.set('spci_shared_token', sharedTokenParam, {
          path: '/',
          maxAge: maxAge > 0 ? maxAge : 1,
          sameSite: 'lax'
        });
        return response;
      }
    }

    // Caso 3: Já possui cookie do token de compartilhamento ativo
    if (sharedTokenCookie) {
      const isValid = await validateSharedToken(sharedTokenCookie);
      if (isValid) {
        return NextResponse.next();
      }
    }

    // Se falhou em todas as validações, redireciona o técnico para o login corporativo
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('spci_shared_token');
    return response;
  }

  // 4. Definição de escopos de proteção de rotas corporativas
  const isPublicRoute = path === '/login' || path === '/acesso-expirado';

  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/configuracoes') || 
    path.startsWith('/ronda') || 
    path.startsWith('/extintores') ||
    path.startsWith('/hidrantes') ||
    path.startsWith('/sinalizacao') ||
    path.startsWith('/iluminacao') ||
    path.startsWith('/bombas') ||
    path.startsWith('/alerts') ||
    path.startsWith('/logs') ||
    path.startsWith('/gestao-ativo');

  // Rotas exclusivas de nível administrativo
  const isAdminRoute = path.startsWith('/configuracoes');

  // 5. Verificação para rotas protegidas sem sessão ativa
  if (!sessionToken && isProtectedRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redireciona usuários logados para a dashboard se tentarem ir no login
  if (sessionToken && path === '/login') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 6. Validação de Expiração de Acesso (ABAC Temporal)
  if (sessionToken && userExpires && path !== '/acesso-expirado') {
    const expirationDate = new Date(userExpires);
    const now = new Date();

    if (expirationDate < now) {
      url.pathname = '/acesso-expirado';
      return NextResponse.redirect(url);
    }
  }

  // 7. Controle RBAC de nível administrativo
  if (isAdminRoute && sessionToken) {
    const isAuthorizedAdmin = 
      userRole === 'Administrador' || 
      userRole === 'Desenvolvedor' ||
      userRole === 'admin';

    if (!isAuthorizedAdmin) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Helper rápido de validação do token compartilhado contra o RPC do Supabase
async function validateSharedToken(token: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) return false;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_shared_token`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_token: token })
    });

    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  } catch (err) {
    console.error('[Middleware Error] Falha ao validar token:', err);
    return false;
  }
}

// Configura o middleware para rodar em todas as rotas relevantes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
