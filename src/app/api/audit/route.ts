import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1));
    const pageSize = 50;
    const rows = await query(
      `SELECT a.id, u.name as user_name, a.action, a.transaction_id, a.details, a.timestamp
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.timestamp DESC LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize]
    );
    return NextResponse.json({ page, items: rows });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar auditoria.' }, { status: 500 });
  }
}
