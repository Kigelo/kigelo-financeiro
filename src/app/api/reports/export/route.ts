import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// GET /api/reports/export?start=&end=&type=&status=
// Gera um CSV (abre nativamente no Excel/Sheets) com todos os lançamentos do período.
// Não pagina: exportação é para o conjunto completo do filtro.
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ANY');
    const sp = req.nextUrl.searchParams;
    const clauses: string[] = [];
    const params: any[] = [];
    const add = (clause: string, val: any) => { params.push(val); clauses.push(clause.replace('?', `$${params.length}`)); };

    if (user.role !== 'ADMIN') add('t.user_id = ?', user.id);
    if (sp.get('start')) add('t.transaction_date >= ?', sp.get('start'));
    if (sp.get('end')) add('t.transaction_date <= ?', sp.get('end'));
    if (sp.get('type')) add('t.type = ?', sp.get('type'));
    if (sp.get('status')) add('t.status = ?', sp.get('status'));

    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const rows = await query<any>(
      `SELECT t.id, t.type, t.transaction_date::text, t.amount::text, pm.name as payment_method,
              op.name as operator, t.installments, c.name as category, t.description, u.name as user_name, t.status
       FROM transactions t
       LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
       LEFT JOIN operators op ON op.id = t.operator_id
       LEFT JOIN categories c ON c.id = t.category_id
       JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY t.transaction_date, t.id`,
      params
    );

    const header = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Forma de Pagamento', 'Operadora', 'Parcelas', 'Valor', 'Usuário', 'Status'];
    const lines = [header.join(';')];
    for (const r of rows) {
      const dateBR = new Date(r.transaction_date + 'T00:00:00').toLocaleDateString('pt-BR');
      const valueBR = Number(r.amount).toFixed(2).replace('.', ',');
      lines.push([
        `#${String(r.id).padStart(6, '0')}`, dateBR, r.type, r.category || '', (r.description || '').replace(/;/g, ','),
        r.payment_method || '', r.operator || '', r.installments || '', valueBR, r.user_name, r.status,
      ].join(';'));
    }
    const csv = '\uFEFF' + lines.join('\r\n'); // BOM para acentuação correta no Excel

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kigelo-relatorio.csv"`,
      },
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao exportar.' }, { status: 500 });
  }
}
