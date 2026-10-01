import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// Único jeito de "corrigir" um lançamento: marcá-lo como ESTORNADO.
// O registro original NUNCA é alterado em valor/data/etc, nem apagado.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { transaction_id, motivo } = await req.json();
    if (!transaction_id || !motivo?.trim()) {
      return NextResponse.json({ error: 'Informe o lançamento e o motivo do estorno.' }, { status: 400 });
    }

    const rows = await query<{ status: string; month_closed: boolean }>('SELECT status, month_closed FROM transactions WHERE id=$1', [transaction_id]);
    if (!rows[0]) return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    if (rows[0].status === 'ESTORNADO') return NextResponse.json({ error: 'Este lançamento já foi estornado.' }, { status: 409 });
    if (rows[0].month_closed) return NextResponse.json({ error: 'O mês deste lançamento está fechado. Reabra o mês antes de estornar.' }, { status: 409 });

    await query(
      `UPDATE transactions
       SET status='ESTORNADO', reversal_reason=$1, reversed_by=$2, reversed_at=now()
       WHERE id=$3`,
      [motivo.trim(), admin.id, transaction_id]
    );
    await query(
      'INSERT INTO audit_logs (user_id, action, transaction_id, details) VALUES ($1,$2,$3,$4)',
      [admin.id, 'Estorno', transaction_id, motivo.trim()]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível estornar.' }, { status: 500 });
  }
}
