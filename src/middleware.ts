import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

// Rotas de página que exigem ADMIN. Isso complementa (não substitui) o
// requireRole('ADMIN') dentro de cada API — mesmo que alguém digite a URL
// diretamente no navegador, o middleware barra antes de a página carregar.
const ADMIN_PATHS = [
  '/usuarios', '/categorias', '/formas-pagamento', '/operadoras',
  '/auditoria', '/fechamento', '/relatorio-semanal', '/relatorio-mensal',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith('/dashboard') || ADMIN_PATHS.some(p => pathname.startsWith(p));
  if (!isProtectedPage) return NextResponse.next();

  const token = req.cookies.get('kigelo_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = (payload as any).role;
    if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/usuarios/:path*', '/categorias/:path*', '/formas-pagamento/:path*', '/operadoras/:path*', '/auditoria/:path*', '/fechamento/:path*', '/relatorio-semanal/:path*', '/relatorio-mensal/:path*'],
};
