'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney, formatDate, todayBR } from '@/lib/api';
import { Shell, Kpi, Card, COLORS } from '@/components/ui';

type Me = { id: number; name: string; role: 'ADMIN' | 'FUNC' };
type Tx = { id: number; type: string; amount: number; status: string; created_at: string; transaction_date: string; payment_method: string; description: string; user_name: string };

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await apiFetch('/api/me');
        setMe(user);
        const data = await apiFetch('/api/transactions');
        setItems(data.items);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading || !me) return <div style={{ padding: 24 }}>Carregando…</div>;

  // Compara pela data do lançamento (transaction_date), não pelo instante de
  // criação (created_at) — e sempre no horário de Brasília, nunca em UTC.
  const today = todayBR();
  const sum = (type: string) => items.filter(t => t.type === type && t.status === 'ATIVO' && t.transaction_date.slice(0, 10) === today).reduce((s, t) => s + Number(t.amount), 0);
  const inD = sum('ENTRADA'), outD = sum('SAIDA'), costD = sum('CUSTO');

  return (
    <Shell role={me.role} active="/dashboard">
      <h1>Olá, {me.name.split(' ')[0]} — {formatDate(today)}</h1>

      {me.role === 'FUNC' && (
        <>
          <a href="/nova-entrada" style={bigBtn(COLORS.green)}>➕ NOVA ENTRADA</a>
          <a href="/nova-saida" style={bigBtn(COLORS.pink)}>➖ NOVA SAÍDA</a>
          <a href="/novo-custo" style={bigBtn(COLORS.navy)}>🧾 NOVO CUSTO</a>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 16 }}>
        <Kpi label="Entradas do dia" value={formatMoney(inD)} color={COLORS.green} />
        <Kpi label="Saídas do dia" value={formatMoney(outD)} color={COLORS.pink} />
        <Kpi label="Custos do dia" value={formatMoney(costD)} color={COLORS.navy} />
        <Kpi label="Saldo do dia" value={formatMoney(inD - outD - costD)} color="#6a3fa0" />
      </div>

      <h2 style={{ color: COLORS.navy, marginTop: 20 }}>Últimos lançamentos</h2>
      <Card style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['ID', 'Tipo', 'Descrição', 'Pagto', 'Valor', 'Usuário', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px', color: '#75808c' }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.slice(0, 10).map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td style={{ padding: 6 }}>#{String(t.id).padStart(6, '0')}</td>
                <td style={{ padding: 6 }}>{t.type}</td>
                <td style={{ padding: 6 }}>{t.description || '-'}</td>
                <td style={{ padding: 6 }}>{t.payment_method || '-'}</td>
                <td style={{ padding: 6, fontWeight: 700, color: COLORS.navy }}>{formatMoney(t.amount)}</td>
                <td style={{ padding: 6 }}>{t.user_name}</td>
                <td style={{ padding: 6 }}>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

function bigBtn(bg: string): React.CSSProperties {
  return { display: 'block', textAlign: 'center', padding: 18, borderRadius: 14, border: 'none', fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 12, background: bg, textDecoration: 'none' };
}
