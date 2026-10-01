import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  }

  const rows = await query<{ id: number; name: string; email: string; password_hash: string; role: 'ADMIN' | 'FUNC'; active: boolean }>(
    'SELECT id, name, email, password_hash, role, active FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: 'Usuário bloqueado. Contate o administrador.' }, { status: 403 });
  }

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [user.id, 'Login', user.email]);

  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
