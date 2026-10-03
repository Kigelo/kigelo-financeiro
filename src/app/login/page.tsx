'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      // Recarregamento completo (não navegação do lado do cliente): garante que o
      // cookie recém-criado seja lido do zero pelo navegador antes de ir pro painel.
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={handleLogin} style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 10px 30px rgba(27,59,92,.12)' }}>
        <img src="/logo.png" alt="KIGELO" style={{ height: 90, borderRadius: '50%', marginBottom: 6 }} />
        <h1 style={{ marginTop: 0 }}>KIGELO Financeiro</h1>
        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1b3b5c', marginBottom: 6 }}>Usuário ou e-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                 style={{ width: '100%', padding: 12, border: '1.5px solid #e8ddd2', borderRadius: 10, fontSize: 16 }} />
        </div>
        <div style={{ textAlign: 'left', marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1b3b5c', marginBottom: 6 }}>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                 style={{ width: '100%', padding: 12, border: '1.5px solid #e8ddd2', borderRadius: 10, fontSize: 16 }} />
        </div>
        <button disabled={loading} type="submit"
                style={{ width: '100%', padding: '12px 18px', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, background: '#d81b7a', color: '#fff' }}>
          {loading ? 'Entrando...' : 'ENTRAR'}
        </button>
        {error && <div style={{ color: '#c62828', fontSize: 13, marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  );
}
