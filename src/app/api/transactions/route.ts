import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

const VALID_TYPES = ['ENTRADA', 'SAIDA', 'CUSTO'];
const VALID_PM = ['Dinheiro', 'PIX', 'Cartão', 'Boleto'];

// POST /api/transactions — cria um lançamento. Uma vez criado, é IMUTÁVEL:
// não existe rota PUT/PATCH/DELETE para transactions neste sistema por design.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ANY'); // ADMIN e FUNC podem lançar
    const body = await req.json();

    if (!VALID_TYPES.includes(body.type)) return bad('Tipo inválido.');
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return bad('Valor inválido.');
    if (!VALID_PM.includes(body.payment_method)) return bad('Forma de pagamento inválida.');

    // Funcionário só pode lançar com a data de hoje (validado no backend).
    const today = new Date().toISOString().slice(0, 10);
    if (user.role !== 'ADMIN' && body.transaction_date !== today) {
      return bad('Funcionários só podem lançar com a data de hoje.');
    }

    const d = new Date(body.transaction_date + 'T00:00:00');
    const closed = await query<{ status: string }>(
      'SELECT status FROM monthly_closings WHERE month=$1 AND year=$2',
      [d.getMonth() + 1, d.getFullYear()]
    );
    if (closed[0]?.status === 'FECHADO') {
      return bad('Este mês está fechado para lançamentos. Contate o administrador.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const pm = await client.query('SELECT id FROM payment_methods WHERE name=$1', [body.payment_method]);
      const pmId = pm.rows[0]?.id;

      let operatorId: number | null = null;
      if (body.payment_method === 'Cartão') {
        const op = await client.query('SELECT id FROM operators WHERE name=$1', [body.operator]);
        operatorId = op.rows[0]?.id ?? null;
      }

      let categoryId: number | null = null;
      if (body.type !== 'ENTRADA' && body.category) {
        const cat = await client.query('SELECT id FROM categories WHERE name=$1', [body.category]);
        categoryId = cat.rows[0]?.id ?? null;
      }

      const ins = await client.query(
        `INSERT INTO transactions
         (type, amount, payment_method_id, operator_id, installments, category_id, supplier,
          invoice_number, description, observation, user_id, transaction_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id, created_at`,
        [
          body.type, amount, pmId, operatorId,
          body.payment_method === 'Cartão' ? body.installments : null,
          categoryId, body.supplier ?? null, body.invoice_number ?? null,
          body.description ?? null, body.observation ?? null,
          user.id, body.transaction_date,
        ]
      );
      const txId = ins.rows[0].id;

      await client.query(
        'INSERT INTO audit_logs (user_id, action, transaction_id, details) VALUES ($1,$2,$3,$4)',
        [user.id, 'Criação de lançamento', txId, `${body.type} ${amount}`]
      );

      await client.query('COMMIT');
      return NextResponse.json({ id: txId, created_at: ins.rows[0].created_at, status: 'ATIVO' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Não foi possível registrar o lançamento.' }, { status: 500 });
  }
}

// GET /api/transactions?start=&end=&type=&status=&user_id=&page=
// Funcionário só enxerga os próprios lançamentos — filtro forçado no backend,
// mesmo que o parâmetro user_id enviado seja de outra pessoa.
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ANY');
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') || 1));
    const pageSize = 25;

    const clauses: string[] = [];
    const params: any[] = [];
    const add = (clause: string, val: any) => { params.push(val); clauses.push(clause.replace('?', `$${params.length}`)); };

    if (user.role !== 'ADMIN') add('t.user_id = ?', user.id);
    if (sp.get('start')) add('t.transaction_date >= ?', sp.get('start'));
    if (sp.get('end')) add('t.transaction_date <= ?', sp.get('end'));
    if (sp.get('type')) add('t.type = ?', sp.get('type'));
    if (sp.get('status')) add('t.status = ?', sp.get('status'));
    if (user.role === 'ADMIN' && sp.get('user_id')) add('t.user_id = ?', sp.get('user_id'));

    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    params.push(pageSize, (page - 1) * pageSize);

    const rows = await query(
      `SELECT t.id, t.type, t.amount, t.transaction_date, t.created_at, t.status, t.description,
              pm.name as payment_method, u.name as user_name
       FROM transactions t
       LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
       JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return NextResponse.json({ page, items: rows });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao buscar lançamentos.' }, { status: 500 });
  }
}

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}


