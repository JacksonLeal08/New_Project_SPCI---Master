import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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

  // 2. Leitura dos cookies de sessão e governança
  const sessionToken = request.cookies.get('spci_session_token')?.value;
  const userRole = request.cookies.get('spci_user_role')?.value;
  const userExpires = request.cookies.get('spci_user_expires')?.value;
  const userProvider = request.cookies.get('spci_user_provider')?.value;

  // 3. Definição de escopos de proteção de rotas
  const isPublicRoute = path === '/login' || path === '/acesso-expirado';

  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/configuracoes') || 
    path.startsWith('/inspecao');

  // Rotas exclusivas de nível administrativo (Administrador/Desenvolvedor)
  const isAdminRoute = 
    path.startsWith('/configuracoes');

  // 4. Verificação 1: Acesso a rotas protegidas ou raiz sem sessão ativa
  if (!sessionToken && !isPublicRoute) {
    url.pathname = '/login'; // Redireciona para tela de login dedicada
    return NextResponse.redirect(url);
  }

  // Redireciona usuários logados para a dashboard se tentarem ir no login
  if (sessionToken && path === '/login') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 5. Verificação 2: Validação de Expiração de Acesso (ABAC Temporal)
  if (sessionToken && userExpires && path !== '/acesso-expirado') {
    const expirationDate = new Date(userExpires);
    const now = new Date();

    if (expirationDate < now) {
      url.pathname = '/acesso-expirado'; // Redireciona para tela de bloqueio
      return NextResponse.redirect(url);
    }
  }

  // 6. Verificação 3: Controle RBAC & ABAC de nível administrativo
  if (isAdminRoute && sessionToken) {
    const isAuthorizedAdmin = 
      userRole === 'Administrador' || 
      userRole === 'Desenvolvedor' ||
      userRole === 'admin';

    // Bloqueia se não for administrador ou se o provedor for 'google' (espectador)
    if (!isAuthorizedAdmin || userProvider === 'google') {
      url.pathname = '/dashboard'; // Redireciona usuários comuns/espectadores para a dashboard
      return NextResponse.redirect(url);
    }
  }

  // Permite prosseguir se passou em todas as regras
  return NextResponse.next();
}

// Configura o middleware para rodar em todas as rotas relevantes
export const config = {
  matcher: [
    /*
     * Matches all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
