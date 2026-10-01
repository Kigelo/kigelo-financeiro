'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, Field, input, btn, COLORS } from '@/components/ui';

type Cat = { id: number; name: string; type: string; active: boolean };

export default function CategoriasPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('SAIDA');

  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (role) load(); }, [role]);
  async function load() { setCats(await apiFetch('/api/categories')); }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name, type }) });
    setName(''); load();
  }
  async function toggle(id: number, active: boolean) {
    await apiFetch('/api/categories', { method: 'PATCH', body: JSON.stringify({ id, active: !active }) });
    load();
  }

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={role} active="/categorias">
      <h1>Categorias</h1>
      <Card>
        <form onSubmit={create} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: 1, minWidth: 160 }}><Field label="Nome"><input style={input()} value={name} onChange={e => setName(e.target.value)} /></Field></div>
          <div style={{ minWidth: 140 }}><Field label="Tipo">
            <select style={input()} value={type} onChange={e => setType(e.target.value)}><option value="SAIDA">Saída</option><option value="CUSTO">Custo</option></select>
          </Field></div>
          <button style={{ ...btn(), marginBottom: 14 }} type="submit">Adicionar</button>
        </form>
      </Card>
      <Card>
        {cats.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.line}` }}>
            <div><b>{c.name}</b><span style={{ color: '#75808c', fontSize: 12, marginLeft: 8 }}>{c.type === 'SAIDA' ? 'Saída' : 'Custo'}</span></div>
            <button onClick={() => toggle(c.id, c.active)} style={{ ...btn('', '', true), padding: '6px 10px', fontSize: 12 }}>{c.active ? 'Desativar' : 'Ativar'}</button>
          </div>
        ))}
      </Card>
    </Shell>
  );
}
