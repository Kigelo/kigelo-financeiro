import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('ANY');
    const rows = await query('SELECT id, name, type, active FROM categories ORDER BY type, name');
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar categorias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { name, type } = await req.json();
    if (!name?.trim() || !['SAIDA', 'CUSTO'].includes(type)) {
      return NextResponse.json({ error: 'Informe nome e tipo válidos.' }, { status: 400 });
    }
    const rows = await query(
      'INSERT INTO categories (name, type) VALUES ($1,$2) ON CONFLICT (name, type) DO NOTHING RETURNING id',
      [name.trim(), type]
    );
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Criação de categoria', name]);
    return NextResponse.json({ id: rows[0]?.id ?? null });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao criar categoria.' }, { status: 500 });
  }
}

// Alterna ativo/inativo. Categorias já usadas em lançamentos nunca são
// excluídas do banco (a FK em transactions.category_id impediria de qualquer forma).
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { id, active } = await req.json();
    await query('UPDATE categories SET active=$1 WHERE id=$2', [active, id]);
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Alteração de categoria', `id=${id} active=${active}`]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao atualizar categoria.' }, { status: 500 });
  }
}
