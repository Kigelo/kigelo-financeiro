import { NextRequest, NextResponse } from 'next/server';
import { put, type PutBlobResult } from '@vercel/blob';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Envia um arquivo (nota fiscal/comprovante) vinculado a um lançamento existente.
// Assim que salvo, não há rota para substituir ou excluir esse documento —
// mesma lógica de imutabilidade aplicada aos lançamentos.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ANY');
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const transactionId = form.get('transaction_id');

    if (!file || !transactionId) {
      return NextResponse.json({ error: 'Arquivo e lançamento são obrigatórios.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Envie PDF, JPG ou PNG.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB).' }, { status: 400 });
    }

    // Confere que o lançamento existe e (se não for admin) pertence ao usuário.
    const tx = await query<{ user_id: number }>('SELECT user_id FROM transactions WHERE id=$1', [Number(transactionId)]);
    if (!tx[0]) return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    if (user.role !== 'ADMIN' && tx[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Você não pode anexar documentos a este lançamento.' }, { status: 403 });
    }

    // O Blob Store do projeto está configurado como privado (mais seguro para
    // comprovantes financeiros): o arquivo não tem uma URL pública direta.
    // Para visualizar, o front-end passa pela rota /api/documents/[id]/arquivo,
    // que confere a sessão e busca o conteúdo pelo "pathname" usando get().
    const pathname = `notas/${transactionId}-${Date.now()}-${file.name}`;
    const blob: PutBlobResult = await put(pathname, file, { access: 'private' });

    // Guardamos o pathname (não a URL completa): é o que a função get() do
    // SDK espera para buscar um blob de um store privado.
    const rows = await query(
      `INSERT INTO documents (transaction_id, file_url, file_name, file_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [Number(transactionId), pathname, file.name, file.type, user.id]
    );
    await query('INSERT INTO audit_logs (user_id, action, transaction_id, details) VALUES ($1,$2,$3,$4)', [user.id, 'Upload de documento', Number(transactionId), file.name]);

    return NextResponse.json({ id: rows[0].id, url: blob.url });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao enviar documento.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('ANY');
    const txId = req.nextUrl.searchParams.get('transaction_id');
    if (!txId) return NextResponse.json({ error: 'Informe o lançamento.' }, { status: 400 });

    const tx = await query<{ user_id: number }>('SELECT user_id FROM transactions WHERE id=$1', [Number(txId)]);
    if (!tx[0]) return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    if (user.role !== 'ADMIN' && tx[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const docs = await query('SELECT id, file_url, file_name, file_type, created_at FROM documents WHERE transaction_id=$1', [Number(txId)]);
    return NextResponse.json(docs);
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Erro ao buscar documentos.' }, { status: 500 });
  }
}

