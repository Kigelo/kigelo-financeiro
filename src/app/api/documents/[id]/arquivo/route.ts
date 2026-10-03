import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// Serve o conteúdo de um comprovante privado do Vercel Blob.
// A URL salva no banco não é pública: só é lida com sucesso se a requisição
// enviar o token de servidor (BLOB_READ_WRITE_TOKEN), que nunca é exposto
// ao navegador. Por isso essa rota existe — ela faz essa busca autenticada
// no lugar do navegador e devolve o arquivo só depois de confirmar que o
// usuário logado tem permissão para ver esse lançamento específico.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole('ANY');
    const docId = Number(params.id);

    const rows = await query<{ file_url: string; file_name: string; file_type: string; transaction_id: number; user_id: number }>(
      `SELECT d.file_url, d.file_name, d.file_type, d.transaction_id, t.user_id
       FROM documents d JOIN transactions t ON t.id = d.transaction_id
       WHERE d.id = $1`,
      [docId]
    );
    const doc = rows[0];
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    if (user.role !== 'ADMIN' && doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const blobRes = await fetch(doc.file_url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Não foi possível carregar o arquivo no momento.' }, { status: 502 });
    }

    const buf = await blobRes.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.file_name}"`,
      },
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao buscar documento.' }, { status: 500 });
  }
}
