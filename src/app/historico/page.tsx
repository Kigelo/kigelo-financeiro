'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney, formatDate } from '@/lib/api';
import { Shell, Card, Field, input, btn, overlay, modal, COLORS } from '@/components/ui';

type Me = { id: number; name: string; role: 'ADMIN' | 'FUNC' };
type Tx = { id: number; type: string; amount: number; status: string; created_at: string; transaction_date: string; payment_method: string; description: string; user_name: string };

export default function HistoricoPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Tx[]>([]);
  const [filters, setFilters] = useState({ start: '', end: '', type: '', status: '' });
  const [estornoId, setEstornoId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { apiFetch('/api/me').then(setMe).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (me) load(); }, [me, filters]);

  async function load() {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as any).toString();
    const data = await apiFetch('/api/transactions?' + qs);
    setItems(data.items);
  }

  async function doEstorno() {
    if (!motivo.trim()) { setError('Informe o motivo.'); return; }
    try {
      await apiFetch('/api/transactions/estornar', { method: 'POST', body: JSON.stringify({ transaction_id: estornoId, motivo }) });
      setEstornoId(null); setMotivo(''); setError('');
      load();
    } catch (e: any) { setError(e.message); }
  }

  if (!me) return <div style={{ padding: 24 }}>Carregando…</div>;

  return (
    <Shell role={me.role} active="/historico">
      <h1>{me.role === 'ADMIN' ? 'Histórico de Lançamentos' : 'Meus Lançamentos'}</h1>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
          <div><label style={{ fontSize: 12 }}>De</label><input type="date" style={input()} value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>Até</label><input type="date" style={input()} value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })} /></div>
          <div><label style={{ fontSize: 12 }}>Tipo</label>
            <select style={input()} value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
              <option value="">Todos</option><option>ENTRADA</option><option>SAIDA</option><option>CUSTO</option>
            </select>
          </div>
          <div><label style={{ fontSize: 12 }}>Status</label>
            <select style={input()} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos</option><option>ATIVO</option><option>ESTORNADO</option>
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}><button style={{ ...btn('', '', true), width: '100%' }} onClick={() => setFilters({ start: '', end: '', type: '', status: '' })}>Limpar</button></div>
        </div>
      </Card>
      <Card style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['ID', 'Data', 'Hora', 'Tipo', 'Descrição', 'Pagto', 'Valor', 'Usuário', 'Status', me.role === 'ADMIN' ? '' : null].filter(x => x !== null).map((h, i) => <th key={i} style={{ textAlign: 'left', padding: 6, color: '#75808c' }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td style={{ padding: 6 }}>#{String(t.id).padStart(6, '0')}</td>
                <td style={{ padding: 6 }}>{formatDate(t.transaction_date)}</td>
                <td style={{ padding: 6 }}>{new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: 6 }}>{t.type}</td>
                <td style={{ padding: 6 }}>{t.description || '-'}</td>
                <td style={{ padding: 6 }}>{t.payment_method || '-'}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>{formatMoney(t.amount)}</td>
                <td style={{ padding: 6 }}>{t.user_name}</td>
                <td style={{ padding: 6 }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.status === 'ATIVO' ? '#e6f4ea' : '#fdecea', color: t.status === 'ATIVO' ? '#2e7d4f' : '#c62828' }}>{t.status}</span></td>
                {me.role === 'ADMIN' && <td style={{ padding: 6 }}>{t.status === 'ATIVO' && <button onClick={() => setEstornoId(t.id)} style={{ ...btn('', '', true), padding: '4px 8px', fontSize: 12 }}>Estornar</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p style={{ color: '#75808c' }}>Nenhum lançamento encontrado.</p>}
      </Card>

      {estornoId && (
        <div style={overlay()}>
          <div style={modal()}>
            <h2 style={{ marginTop: 0 }}>Estornar lançamento #{String(estornoId).padStart(6, '0')}</h2>
            <Field label="Motivo do estorno"><textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} style={input()} /></Field>
            {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEstornoId(null); setError(''); }} style={{ ...btn('', '', true), flex: 1 }}>Cancelar</button>
              <button onClick={doEstorno} style={{ ...btn(), flex: 1 }}>Confirmar Estorno</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
