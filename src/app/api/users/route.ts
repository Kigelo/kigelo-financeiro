import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('ADMIN');
    const rows = await query('SELECT id, name, email, role, active, created_at FROM users ORDER BY name');
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar usuários.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { name, email, password, role } = await req.json();
    if (!name?.trim() || !email?.trim() || !password || !['ADMIN', 'FUNC'].includes(role)) {
      return NextResponse.json({ error: 'Preencha todos os campos corretamente.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter ao menos 8 caracteres.' }, { status: 400 });
    }
    const hash = await hashPassword(password);
    const rows = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name.trim(), email.trim().toLowerCase(), hash, role]
    );
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Criação de usuário', email]);
    return NextResponse.json({ id: rows[0].id });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e.code === '23505') return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}

// Não existe DELETE por design: um usuário que já lançou algo precisa
// permanecer associado ao seu histórico para sempre. Bloquear = active=false.
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { id, active } = await req.json();
    if (id === admin.id && active === false) {
      return NextResponse.json({ error: 'Você não pode bloquear a si mesmo.' }, { status: 400 });
    }
    await query('UPDATE users SET active=$1, updated_at=now() WHERE id=$2', [active, id]);
    await query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)',
      [admin.id, active ? 'Ativação de usuário' : 'Bloqueio de usuário', `id=${id}`]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}
