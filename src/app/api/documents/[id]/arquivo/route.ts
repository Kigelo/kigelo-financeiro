import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { query } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';

// Serve o conteúdo de um comprovante privado do Vercel Blob.
// Um blob privado não tem URL acessível direto pelo navegador: só o servidor,
// usando o token (BLOB_READ_WRITE_TOKEN), consegue buscá-lo via get(). Por
// isso essa rota existe — ela faz essa busca autenticada no lugar do
// navegador e devolve o arquivo só depois de confirmar que o usuário logado
// tem permissão para ver esse lançamento específico.
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

    // doc.file_url guarda o "pathname" do blob (ex: notas/123-...-nome.pdf),
    // não uma URL pública — get() é a forma correta de buscar esse conteúdo
    // num store privado.
    const result = await get(doc.file_url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Não foi possível carregar o arquivo no momento.' }, { status: 502 });
    }

    return new NextResponse(result.stream as any, {
      headers: {
        'Content-Type': doc.file_type || result.blob.contentType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.file_name}"`,
      },
    });
  } catch (e: any) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Erro ao buscar documento.' }, { status: 500 });
  }
}
