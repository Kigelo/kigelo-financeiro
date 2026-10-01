'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, Field, input, btn, COLORS } from '@/components/ui';

type Op = { id: number; name: string; active: boolean };

export default function OperadorasPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [list, setList] = useState<Op[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role]);
  async function load() { setList(await apiFetch('/api/operators')); }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await apiFetch('/api/operators', { method: 'POST', body: JSON.stringify({ name }) });
    setName(''); load();
  }
  async function toggle(id: number, active: boolean) {
    await apiFetch('/api/operators', { method: 'PATCH', body: JSON.stringify({ id, active: !active }) });
    load();
  }

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={role} active="/operadoras">
      <h1>Operadoras</h1>
      <Card>
        <form onSubmit={create} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <div style={{ flex: 1 }}><Field label="Nova operadora"><input style={input()} value={name} onChange={e => setName(e.target.value)} /></Field></div>
          <button style={{ ...btn(), marginBottom: 14 }} type="submit">Adicionar</button>
        </form>
      </Card>
      <Card>
        {list.map(o => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.line}` }}>
            <b>{o.name}</b>
            <button onClick={() => toggle(o.id, o.active)} style={{ ...btn('', '', true), padding: '6px 10px', fontSize: 12 }}>{o.active ? 'Desativar' : 'Ativar'}</button>
          </div>
        ))}
      </Card>
    </Shell>
  );
}
