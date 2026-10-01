'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney } from '@/lib/api';
import { Shell, Card, Kpi, COLORS, btn } from '@/components/ui';

type Tx = { type: string; amount: number; status: string; transaction_date: string; payment_method: string; user_name: string };

export default function RelatorioDiarioPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Tx[]>([]);

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role, date]);
  async function load() {
    const data = await apiFetch(`/api/transactions?start=${date}&end=${date}&status=ATIVO`);
    setItems(data.items);
  }

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;

  const entradas = items.filter(t => t.type === 'ENTRADA');
  const inTotal = entradas.reduce((s, t) => s + Number(t.amount), 0);
  const outTotal = items.filter(t => t.type === 'SAIDA').reduce((s, t) => s + Number(t.amount), 0);
  const costTotal = items.filter(t => t.type === 'CUSTO').reduce((s, t) => s + Number(t.amount), 0);
  const byPm = ['Dinheiro', 'PIX', 'Débito', 'Crédito'].map(pm => ({ pm, total: entradas.filter(t => t.payment_method === pm).reduce((s, t) => s + Number(t.amount), 0) }));

  return (
    <Shell role={role} active="/relatorio-diario">
      <h1>Relatório Diário</h1>
      <Card>
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>Data</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ display: 'block', marginTop: 6, padding: 10, border: `1.5px solid ${COLORS.line}`, borderRadius: 8 }} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {byPm.map(x => <Kpi key={x.pm} label={x.pm} value={formatMoney(x.total)} color={COLORS.green} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 10 }}>
        <Kpi label="Total de entradas" value={formatMoney(inTotal)} color={COLORS.green} />
        <Kpi label="Saídas" value={formatMoney(outTotal)} color={COLORS.pink} />
        <Kpi label="Custos" value={formatMoney(costTotal)} color={COLORS.navy} />
        <Kpi label="Saldo do dia" value={formatMoney(inTotal - outTotal - costTotal)} color="#6a3fa0" />
      </div>

      <Card style={{ marginTop: 14 }}>
        <p style={{ color: '#75808c', margin: 0 }}>{items.length} lançamento(s) ativo(s) nesta data.</p>
        <a href={`/api/reports/export?start=${date}&end=${date}&status=ATIVO`} style={{ ...btn(), display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>Exportar CSV/Excel</a>
        <button onClick={() => window.print()} style={{ ...btn('', '', true), marginTop: 10, marginLeft: 8 }}>Exportar PDF (imprimir)</button>
      </Card>
    </Shell>
  );
}
