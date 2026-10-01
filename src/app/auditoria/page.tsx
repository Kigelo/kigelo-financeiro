'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Shell, Card, COLORS } from '@/components/ui';

type Log = { id: number; user_name: string; action: string; transaction_id: number | null; details: string; timestamp: string };

export default function AuditoriaPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login'));
    apiFetch('/api/audit').then(d => setLogs(d.items)).catch(() => {});
  }, [router]);

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;
  return (
    <Shell role={role} active="/auditoria">
      <h1>Auditoria</h1>
      <Card style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Usuário', 'Ação', 'Lançamento', 'Detalhes', 'Quando'].map(h => <th key={h} style={{ textAlign: 'left', padding: 6, color: '#75808c' }}>{h}</th>)}</tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td style={{ padding: 6 }}>{l.user_name || '-'}</td>
                <td style={{ padding: 6 }}>{l.action}</td>
                <td style={{ padding: 6 }}>{l.transaction_id ? `#${String(l.transaction_id).padStart(6, '0')}` : '-'}</td>
                <td style={{ padding: 6 }}>{l.details || '-'}</td>
                <td style={{ padding: 6 }}>{new Date(l.timestamp).toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
