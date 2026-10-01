'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney } from '@/lib/api';
import { Shell, Card, Kpi, COLORS, btn } from '@/components/ui';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function RelatorioMensalPage() {
  const router = useRouter();
  const now = new Date();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role, month, year]);
  async function load() { setData(await apiFetch(`/api/reports/monthly?month=${month}&year=${year}`)); }

  if (!role || !data) return <div style={{ padding: 24 }}>Carregando…</div>;

  const maxCat = Math.max(1, ...data.ranking.map((r: any) => r.total));
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  return (
    <Shell role={role} active="/relatorio-mensal">
      <h1>Relatório Mensal</h1>
      <Card style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <Kpi label="Total de entradas" value={formatMoney(data.totals.entradas)} color={COLORS.green} />
        <Kpi label="Total de saídas" value={formatMoney(data.totals.saidas)} color={COLORS.pink} />
        <Kpi label="Total de custos" value={formatMoney(data.totals.custos)} color={COLORS.navy} />
        <Kpi label="Saldo final" value={formatMoney(data.totals.saldo)} color="#6a3fa0" />
      </div>

      <h2 style={{ color: COLORS.navy, marginTop: 20 }}>Formas de pagamento</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {data.byPm.map((x: any) => <Kpi key={x.pm} label={x.pm} value={formatMoney(x.total)} color={COLORS.navy} />)}
      </div>

      <h2 style={{ color: COLORS.navy }}>Ranking de categorias de despesas</h2>
      <Card>
        {data.ranking.length === 0 && <p style={{ color: '#75808c' }}>Nenhuma despesa categorizada neste período.</p>}
        {data.ranking.map((r: any, i: number) => (
          <div key={r.category} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{i + 1}. {r.category}</b><span>{formatMoney(r.total)}</span></div>
            <div style={{ height: 10, borderRadius: 6, background: COLORS.line, overflow: 'hidden', marginTop: 4 }}>
              <div style={{ width: `${(r.total / maxCat) * 100}%`, height: '100%', background: COLORS.pink }} />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <a href={`/api/reports/export?start=${start}&end=${end}&status=ATIVO`} style={{ ...btn(), display: 'inline-block', textDecoration: 'none' }}>Exportar CSV/Excel</a>
        <button onClick={() => window.print()} style={{ ...btn('', '', true), marginLeft: 8 }}>Exportar PDF (imprimir)</button>
      </Card>
    </Shell>
  );
}
