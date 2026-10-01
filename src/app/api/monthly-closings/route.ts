import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireRole('ADMIN');
    const rows = await query(
      `SELECT mc.*, u1.name as closed_by_name, u2.name as reopened_by_name
       FROM monthly_closings mc
       LEFT JOIN users u1 ON u1.id = mc.closed_by
       LEFT JOIN users u2 ON u2.id = mc.reopened_by
       ORDER BY year DESC, month DESC`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar fechamentos.' }, { status: 500 });
  }
}

// action: 'fechar' | 'reabrir'
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole('ADMIN');
    const { month, year, action } = await req.json();
    if (!month || !year || !['fechar', 'reabrir'].includes(action)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    if (action === 'fechar') {
      await query(
        `INSERT INTO monthly_closings (month, year, closed_by, closed_at, status)
         VALUES ($1,$2,$3,now(),'FECHADO')
         ON CONFLICT (month, year) DO UPDATE SET closed_by=$3, closed_at=now(), status='FECHADO', reopened_by=NULL, reopened_at=NULL`,
        [month, year, admin.id]
      );
      // Os lançamentos do período ficam apenas para consulta: transactions.month_closed
      await query(
        `UPDATE transactions SET month_closed = TRUE
         WHERE EXTRACT(MONTH FROM transaction_date)=$1 AND EXTRACT(YEAR FROM transaction_date)=$2`,
        [month, year]
      );
      await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Fechamento de mês', `${month}/${year}`]);
    } else {
      await query(
        `UPDATE monthly_closings SET status='ABERTO', reopened_by=$1, reopened_at=now() WHERE month=$2 AND year=$3`,
        [admin.id, month, year]
      );
      await query(
        `UPDATE transactions SET month_closed = FALSE
         WHERE EXTRACT(MONTH FROM transaction_date)=$1 AND EXTRACT(YEAR FROM transaction_date)=$2`,
        [month, year]
      );
      await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [admin.id, 'Reabertura de mês', `${month}/${year}`]);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao processar fechamento.' }, { status: 500 });
  }
}
