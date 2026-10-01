import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query } from './db';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!); // defina uma string longa e aleatória no .env
const COOKIE = 'kigelo_session';

export type SessionUser = { id: number; name: string; email: string; role: 'ADMIN' | 'FUNC' };

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

// ESSENCIAL: toda rota de API/servidor deve chamar isto para saber quem está logado.
// Nunca confiar em dados enviados pelo cliente para identificar o usuário.
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// Guard de permissão para uso em toda API que exige um papel específico.
// Lança erro 403 se o usuário não tiver a role exigida — a validação
// acontece SEMPRE no backend, nunca apenas escondendo botões no frontend.
export async function requireRole(role: 'ADMIN' | 'FUNC' | 'ANY'): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError(401, 'Não autenticado.');
  if (role !== 'ANY' && user.role !== role) throw new AuthError(403, 'Acesso negado.');

  // Revalida contra o banco a cada chamada sensível: se o usuário foi bloqueado
  // após o login, o token antigo não deve continuar dando acesso.
  const rows = await query<{ active: boolean }>('SELECT active FROM users WHERE id = $1', [user.id]);
  if (!rows[0]?.active) throw new AuthError(403, 'Usuário bloqueado.');

  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
