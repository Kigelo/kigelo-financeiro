import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('ANY');
    const rows = await query('SELECT id, name, active FROM operators ORDER BY name');
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar operadoras.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Informe o nome.' }, { status: 400 });
    const rows = await query('INSERT INTO operators (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id', [name.trim()]);
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Criação de operadora', name]);
    return NextResponse.json({ id: rows[0]?.id ?? null });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao criar operadora.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { id, active } = await req.json();
    await query('UPDATE operators SET active=$1 WHERE id=$2', [active, id]);
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Alteração de operadora', `id=${id} active=${active}`]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao atualizar operadora.' }, { status: 500 });
  }
}
