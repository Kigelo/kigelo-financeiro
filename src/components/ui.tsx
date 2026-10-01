'use client';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export const COLORS = { pink: '#d81b7a', green: '#7cb342', navy: '#1b3b5c', cream: '#fdf3ec', line: '#e8ddd2', ink: '#22303f' };

const ADMIN_MENU = [
  ['/dashboard', 'Dashboard'], ['/nova-entrada', 'Nova Entrada'], ['/nova-saida', 'Nova Saída'], ['/novo-custo', 'Novo Custo'],
  ['/historico', 'Histórico'], ['/relatorio-diario', 'Relatório Diário'], ['/relatorio-semanal', 'Relatório Semanal'],
  ['/relatorio-mensal', 'Relatório Mensal'], ['/fechamento', 'Fechamento'], ['/usuarios', 'Usuários'],
  ['/categorias', 'Categorias'], ['/formas-pagamento', 'Formas de Pagamento'], ['/operadoras', 'Operadoras'], ['/auditoria', 'Auditoria'],
];
const FUNC_MENU = [
  ['/dashboard', 'Dashboard'], ['/nova-entrada', 'Nova Entrada'], ['/nova-saida', 'Nova Saída'],
  ['/novo-custo', 'Novo Custo'], ['/historico', 'Meus Lançamentos'],
];

export function Shell({ role, active, children }: { role: 'ADMIN' | 'FUNC'; active: string; children: React.ReactNode }) {
  const router = useRouter();
  const menu = role === 'ADMIN' ? ADMIN_MENU : FUNC_MENU;
  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  return (
    <div>
      <div style={{ background: COLORS.navy, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', position: 'sticky', top: 0, zIndex: 20 }}>
        <img src="/logo.png" style={{ height: 34, borderRadius: '50%' }} />
        <div style={{ fontWeight: 700 }}>KIGELO</div>
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.4)', color: '#fff', padding: '6px 10px', borderRadius: 8 }}>Sair</button>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '8px 14px', background: '#fff', borderBottom: `1px solid ${COLORS.line}`, position: 'sticky', top: 54, zIndex: 19 }}>
        {menu.map(([href, label]) => (
          <a key={href} href={href} style={{ whiteSpace: 'nowrap', border: 'none', background: active === href ? COLORS.pink : COLORS.cream, color: active === href ? '#fff' : COLORS.navy, padding: '8px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            {label}
          </a>
        ))}
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>{children}</div>
    </div>
  );
}

// Cartão de valor com fundo colorido da marca e o número em BRANCO (alto contraste, legível).
export function Kpi({ label, value, color = COLORS.pink }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: color, borderRadius: 14, padding: 14, color: '#fff' }}>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#fff' }}>{value}</div>
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 14, ...style }}>{children}</div>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>{label}</label>{children}</div>;
}
export function input(): React.CSSProperties { return { width: '100%', padding: 12, border: `1.5px solid ${COLORS.line}`, borderRadius: 10, fontSize: 16 }; }
export function btn(bg = COLORS.pink, color = '#fff', ghost = false): React.CSSProperties {
  return { padding: '12px 18px', border: ghost ? `1.5px solid ${COLORS.line}` : 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, background: ghost ? '#fff' : bg, color: ghost ? COLORS.navy : color, cursor: 'pointer' };
}
export function overlay(): React.CSSProperties { return { position: 'fixed', inset: 0, background: 'rgba(20,20,20,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }; }
export function modal(): React.CSSProperties { return { background: '#fff', borderRadius: 16, padding: 20, maxWidth: 440, width: '100%', maxHeight: '85vh', overflow: 'auto' }; }

// Valor monetário em destaque — usado dentro de faixas/cartões coloridos, sempre branco.
export function Money({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return <span style={{ color: '#fff', fontWeight: 800, fontSize: size }}>{children}</span>;
}
