import { NextRequest, NextResponse } from 'next/server';

// Esta camada roda num ambiente restrito da Vercel (Edge) e serve só para
// redirecionar rapidamente quem não tem cookie de sessão nenhum — é uma
// conveniência de navegação, não a barreira de segurança real.
//
// A barreira de segurança real está em cada rota de API (src/app/api/**),
// que chama requireRole() no servidor (ambiente Node, não Edge) antes de
// ler ou gravar qualquer dado. Mesmo que alguém digite a URL de uma página
// administrativa diretamente, nenhuma chamada a dados sensíveis é atendida
// sem a verificação completa e correta da sessão acontecer ali.
const PROTECTED_PATHS = [
  '/dashboard', '/nova-entrada', '/nova-saida', '/novo-custo', '/historico',
  '/usuarios', '/categorias', '/formas-pagamento', '/operadoras',
  '/auditoria', '/fechamento', '/relatorio-diario', '/relatorio-semanal', '/relatorio-mensal',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedPage = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (!isProtectedPage) return NextResponse.next();

  const hasCookie = req.cookies.has('kigelo_session');
  if (!hasCookie) return NextResponse.redirect(new URL('/login', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/nova-entrada/:path*', '/nova-saida/:path*', '/novo-custo/:path*', '/historico/:path*',
    '/usuarios/:path*', '/categorias/:path*', '/formas-pagamento/:path*', '/operadoras/:path*',
    '/auditoria/:path*', '/fechamento/:path*', '/relatorio-diario/:path*', '/relatorio-semanal/:path*', '/relatorio-mensal/:path*',
  ],
};
