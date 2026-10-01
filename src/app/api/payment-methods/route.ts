import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('ANY');
    const rows = await query('SELECT id, name, active FROM payment_methods ORDER BY name');
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar formas de pagamento.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { id, active, name } = await req.json();
    if (name) {
      await query('UPDATE payment_methods SET name=$1 WHERE id=$2', [name.trim(), id]);
    }
    if (typeof active === 'boolean') {
      await query('UPDATE payment_methods SET active=$1 WHERE id=$2', [active, id]);
    }
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Alteração de forma de pagamento', `id=${id}`]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }
}
