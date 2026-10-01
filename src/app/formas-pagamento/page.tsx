'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, btn, COLORS } from '@/components/ui';

type PM = { id: number; name: string; active: boolean };

export default function FormasPagamentoPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [list, setList] = useState<PM[]>([]);

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role]);
  async function load() { setList(await apiFetch('/api/payment-methods')); }
  async function toggle(id: number, active: boolean) {
    await apiFetch('/api/payment-methods', { method: 'PATCH', body: JSON.stringify({ id, active: !active }) });
    load();
  }

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={role} active="/formas-pagamento">
      <h1>Formas de Pagamento</h1>
      <Card>
        {list.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.line}` }}>
            <b>{p.name}</b>
            <button onClick={() => toggle(p.id, p.active)} style={{ ...btn('', '', true), padding: '6px 10px', fontSize: 12 }}>{p.active ? 'Desativar' : 'Ativar'}</button>
          </div>
        ))}
        <p style={{ color: '#75808c', fontSize: 12, marginTop: 10 }}>Formas de pagamento já usadas em lançamentos nunca são excluídas — apenas desativadas.</p>
      </Card>
    </Shell>
  );
}
