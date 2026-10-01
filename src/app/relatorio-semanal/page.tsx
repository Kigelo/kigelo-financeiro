'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney, formatDate } from '@/lib/api';
import { Shell, Card, Kpi, COLORS, btn } from '@/components/ui';

function mondayOf(d: Date) { const dt = new Date(d); const day = dt.getDay(); dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1)); return dt.toISOString().slice(0, 10); }

export default function RelatorioSemanalPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [start, setStart] = useState(mondayOf(new Date()));
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role, start]);
  async function load() { setData(await apiFetch(`/api/reports/weekly?start=${start}`)); }

  if (!role || !data) return <div style={{ padding: 24 }}>Carregando…</div>;

  const maxVal = Math.max(1, ...data.byDay.map((d: any) => Math.max(d.entradas, d.saidas + d.custos)));
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <Shell role={role} active="/relatorio-semanal">
      <h1>Relatório Semanal</h1>
      <Card>
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy }}>Início da semana (segunda-feira)</label>
        <input type="date" value={start} onChange={e => setStart(mondayOf(new Date(e.target.value)))} style={{ display: 'block', marginTop: 6, padding: 10, border: `1.5px solid ${COLORS.line}`, borderRadius: 8 }} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <Kpi label="Total entradas" value={formatMoney(data.totals.entradas)} color={COLORS.green} />
        <Kpi label="Total saídas" value={formatMoney(data.totals.saidas)} color={COLORS.pink} />
        <Kpi label="Total custos" value={formatMoney(data.totals.custos)} color={COLORS.navy} />
        <Kpi label="Saldo da semana" value={formatMoney(data.totals.entradas - data.totals.saidas - data.totals.custos)} color="#6a3fa0" />
      </div>

      <h2 style={{ color: COLORS.navy, marginTop: 20 }}>Entradas x Despesas por dia</h2>
      <Card>
        {data.byDay.map((d: any, i: number) => (
          <div key={d.date} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{diasSemana[i]} — {formatDate(d.date)}</b><span>{formatMoney(d.entradas)} / {formatMoney(d.saidas + d.custos)}</span></div>
            <div style={{ display: 'flex', gap: 4, height: 10 }}>
              <div style={{ width: `${(d.entradas / maxVal) * 100}%`, background: COLORS.green, borderRadius: 4 }} />
              <div style={{ width: `${((d.saidas + d.custos) / maxVal) * 100}%`, background: COLORS.pink, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </Card>

      <h2 style={{ color: COLORS.navy }}>Formas de pagamento (entradas)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {data.byPm.map((x: any) => <Kpi key={x.pm} label={x.pm} value={formatMoney(x.total)} color={COLORS.navy} />)}
      </div>

      <Card style={{ marginTop: 14 }}>
        <a href={`/api/reports/export?start=${data.start}&end=${data.end}&status=ATIVO`} style={{ ...btn(), display: 'inline-block', textDecoration: 'none' }}>Exportar CSV/Excel</a>
        <button onClick={() => window.print()} style={{ ...btn('', '', true), marginLeft: 8 }}>Exportar PDF (imprimir)</button>
      </Card>
    </Shell>
  );
}
