'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, Field, input, btn, COLORS } from '@/components/ui';

type Me = { role: 'ADMIN' | 'FUNC' };
type User = { id: number; name: string; email: string; role: string; active: boolean };

export default function UsuariosPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FUNC' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { apiFetch('/api/me').then(setMe).catch(() => router.push('/login')); }, [router]);
  useEffect(() => { if (me) load(); }, [me]);
  async function load() { setUsers(await apiFetch('/api/users')); }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', password: '', role: 'FUNC' });
      setOk('Usuário criado com sucesso.');
      load();
    } catch (e: any) { setError(e.message); }
  }
  async function toggle(id: number, active: boolean) {
    await apiFetch('/api/users', { method: 'PATCH', body: JSON.stringify({ id, active: !active }) });
    load();
  }

  if (!me) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={me.role} active="/usuarios">
      <h1>Usuários</h1>
      <Card>
        <form onSubmit={create}>
          <Field label="Nome"><input style={input()} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="E-mail"><input style={input()} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Senha (mín. 8 caracteres)"><input type="password" style={input()} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Perfil">
            <select style={input()} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="FUNC">Funcionário</option><option value="ADMIN">Administrador</option>
            </select>
          </Field>
          <button style={btn()} type="submit">Criar usuário</button>
          {error && <div style={{ color: '#c62828', fontSize: 13, marginTop: 8 }}>{error}</div>}
          {ok && <div style={{ color: '#2e7d4f', fontSize: 13, marginTop: 8 }}>{ok}</div>}
        </form>
      </Card>
      <Card>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.line}` }}>
            <div><b>{u.name}</b><div style={{ color: '#75808c', fontSize: 12 }}>{u.email} — {u.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}</div></div>
            <button onClick={() => toggle(u.id, u.active)} style={{ ...btn('', '', true), padding: '6px 10px', fontSize: 12 }}>{u.active ? 'Bloquear' : 'Ativar'}</button>
          </div>
        ))}
      </Card>
    </Shell>
  );
}
