'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, btn, COLORS } from '@/components/ui';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function FechamentoPage() {
  const router = useRouter();
  const now = new Date();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [list, setList] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role]);
  async function load() { setList(await apiFetch('/api/monthly-closings')); }

  async function action(a: 'fechar' | 'reabrir') {
    setError('');
    try {
      await apiFetch('/api/monthly-closings', { method: 'POST', body: JSON.stringify({ month, year, action: a }) });
      load();
    } catch (e: any) { setError(e.message); }
  }

  const current = list.find(l => l.month === month && l.year === year);
  const isClosed = current?.status === 'FECHADO';

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={role} active="/fechamento">
      <h1>Fechamento de Mês</h1>
      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, display: 'block', marginBottom: 6 }}>Mês</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: 10, border: `1.5px solid ${COLORS.line}`, borderRadius: 8 }}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, display: 'block', marginBottom: 6 }}>Ano</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: 10, border: `1.5px solid ${COLORS.line}`, borderRadius: 8, width: 100 }} />
          </div>
          <div>
            {isClosed
              ? <button onClick={() => action('reabrir')} style={btn('', '', true)}>Reabrir mês</button>
              : <button onClick={() => action('fechar')} style={btn(COLORS.navy)}>Fechar mês</button>}
          </div>
        </div>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Status atual: <b style={{ color: isClosed ? '#c62828' : '#2e7d4f' }}>{isClosed ? 'FECHADO' : 'ABERTO'}</b>
        </p>
        <p style={{ color: '#75808c', fontSize: 12 }}>Ao fechar, os lançamentos do período ficam somente para consulta. Correções só via estorno, após reabertura.</p>
        {error && <div style={{ color: '#c62828', fontSize: 13 }}>{error}</div>}
      </Card>

      <h2 style={{ color: COLORS.navy }}>Histórico de fechamentos</h2>
      <Card>
        {list.map(l => (
          <div key={`${l.month}-${l.year}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.line}`, fontSize: 13 }}>
            <span>{MESES[l.month - 1]}/{l.year}</span>
            <span style={{ fontWeight: 700, color: l.status === 'FECHADO' ? '#c62828' : '#2e7d4f' }}>{l.status}</span>
            <span style={{ color: '#75808c' }}>{l.closed_by_name ? `Fechado por ${l.closed_by_name}` : ''}</span>
          </div>
        ))}
        {!list.length && <p style={{ color: '#75808c' }}>Nenhum fechamento registrado ainda.</p>}
      </Card>
    </Shell>
  );
}
