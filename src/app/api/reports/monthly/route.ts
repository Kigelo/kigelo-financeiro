import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// GET /api/reports/monthly?month=1-12&year=YYYY
export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN');
    const month = Number(req.nextUrl.searchParams.get('month'));
    const year = Number(req.nextUrl.searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'Informe mês e ano.' }, { status: 400 });

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

    const rows = await query<{ transaction_date: string; type: string; amount: string; payment_method: string; category: string | null }>(
      `SELECT t.transaction_date::text, t.type, t.amount::text, pm.name as payment_method, c.name as category
       FROM transactions t
       LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.status='ATIVO' AND t.transaction_date BETWEEN $1 AND $2`,
      [start, end]
    );

    const totalEntradas = rows.filter(r => r.type === 'ENTRADA').reduce((s, r) => s + Number(r.amount), 0);
    const totalSaidas = rows.filter(r => r.type === 'SAIDA').reduce((s, r) => s + Number(r.amount), 0);
    const totalCustos = rows.filter(r => r.type === 'CUSTO').reduce((s, r) => s + Number(r.amount), 0);

    const byPm = ['Dinheiro', 'PIX', 'Débito', 'Crédito'].map(pm => ({
      pm, total: rows.filter(r => r.type === 'ENTRADA' && r.payment_method === pm).reduce((s, r) => s + Number(r.amount), 0),
    }));

    const catMap: Record<string, number> = {};
    rows.filter(r => (r.type === 'SAIDA' || r.type === 'CUSTO') && r.category).forEach(r => {
      catMap[r.category!] = (catMap[r.category!] || 0) + Number(r.amount);
    });
    const ranking = Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);

    const daysInMonth = endDate;
    const byDay = Array.from({ length: daysInMonth }, (_, i) => {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      const dayRows = rows.filter(r => r.transaction_date === date);
      return {
        date,
        entradas: dayRows.filter(r => r.type === 'ENTRADA').reduce((s, r) => s + Number(r.amount), 0),
        saidas: dayRows.filter(r => r.type === 'SAIDA').reduce((s, r) => s + Number(r.amount), 0),
        custos: dayRows.filter(r => r.type === 'CUSTO').reduce((s, r) => s + Number(r.amount), 0),
      };
    });

    return NextResponse.json({
      month, year, totals: { entradas: totalEntradas, saidas: totalSaidas, custos: totalCustos, saldo: totalEntradas - totalSaidas - totalCustos },
      byPm, ranking, byDay,
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar relatório mensal.' }, { status: 500 });
  }
}
