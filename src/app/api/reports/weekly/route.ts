import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// GET /api/reports/weekly?start=YYYY-MM-DD  (start = segunda-feira da semana desejada)
export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const start = req.nextUrl.searchParams.get('start');
    if (!start) return NextResponse.json({ error: 'Informe a data de início da semana.' }, { status: 400 });

    const startDate = new Date(start + 'T00:00:00');
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const end = days[6];

    const rows = await query<{ transaction_date: string; type: string; amount: string; payment_method: string }>(
      `SELECT t.transaction_date::text, t.type, t.amount::text, pm.name as payment_method
       FROM transactions t LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
       WHERE t.status='ATIVO' AND t.transaction_date BETWEEN $1 AND $2`,
      [start, end]
    );

    const byDay = days.map(date => {
      const dayRows = rows.filter(r => r.transaction_date === date);
      const entradas = dayRows.filter(r => r.type === 'ENTRADA').reduce((s, r) => s + Number(r.amount), 0);
      const saidas = dayRows.filter(r => r.type === 'SAIDA').reduce((s, r) => s + Number(r.amount), 0);
      const custos = dayRows.filter(r => r.type === 'CUSTO').reduce((s, r) => s + Number(r.amount), 0);
      return { date, entradas, saidas, custos, saldo: entradas - saidas - custos };
    });

    const byPm = ['Dinheiro', 'PIX', 'Cartão', 'Boleto'].map(pm => ({
      pm, total: rows.filter(r => r.type === 'ENTRADA' && r.payment_method === pm).reduce((s, r) => s + Number(r.amount), 0),
    }));

    const totals = byDay.reduce((acc, d) => ({ entradas: acc.entradas + d.entradas, saidas: acc.saidas + d.saidas, custos: acc.custos + d.custos }), { entradas: 0, saidas: 0, custos: 0 });

    return NextResponse.json({ start, end, byDay, byPm, totals });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar relatório semanal.' }, { status: 500 });
  }
}
