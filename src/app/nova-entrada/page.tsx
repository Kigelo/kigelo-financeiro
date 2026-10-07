'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney } from '@/lib/api';
import { Shell } from '@/components/ui';

const PM = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto'];
const OPERATORS = ['Stone', 'Cielo', 'Rede', 'PagSeguro', 'Mercado Pago', 'Outra'];

export default function NovaEntradaPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  useEffect(() => { apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login')); }, [router]);
  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pm, setPm] = useState('');
  const [operator, setOperator] = useState(OPERATORS[0]);
  const [installments, setInstallments] = useState('1x');
  const [observation, setObservation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<number | null>(null);
  const [docWarning, setDocWarning] = useState('');

  function openConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const val = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (!val || val <= 0) { setError('Informe um valor válido.'); return; }
    if (!pm) { setError('Selecione a forma de pagamento.'); return; }
    setConfirming(true);
  }

  async function confirm() {
    const val = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ENTRADA',
          amount: val,
          payment_method: pm,
          operator: pm === 'Débito' || pm === 'Crédito' ? operator : null,
          installments: pm === 'Crédito' ? installments : null,
          description,
          observation,
          transaction_date: today,
        }),
      });
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('transaction_id', String(res.id));
        const docRes = await fetch('/api/documents', { method: 'POST', body: form, credentials: 'include' });
        if (!docRes.ok) {
          const d = await docRes.json().catch(() => ({}));
          setDocWarning(d.error || 'O lançamento foi salvo, mas o comprovante não pôde ser enviado.');
        }
      }
      setConfirming(false);
      setSuccess(res.id);
    } catch (err: any) {
      setConfirming(false);
      setError(err.message);
    }
  }

  if (!role) return <div style={{ padding: 24 }}>Carregando…</div>;

  if (success) {
    return (
      <Shell role={role} active="/nova-entrada">
        <div style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <h2>Entrada registrada com sucesso!</h2>
          <p>Lançamento #{String(success).padStart(6, '0')}</p>
          {docWarning && <p style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#c62828', padding: 10, borderRadius: 8, fontSize: 13 }}>{docWarning}</p>}
          <button onClick={() => router.push('/dashboard')} style={btn()}>Voltar ao início</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role={role} active="/nova-entrada">
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1>Nova Entrada</h1>
      <form onSubmit={openConfirm} style={{ background: '#fff', border: '1px solid #e8ddd2', borderRadius: 14, padding: 16 }}>
        <Field label="Descrição"><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Venda balcão" style={input()} /></Field>
        <Field label="Valor"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" style={input()} /></Field>
        <Field label="Forma de pagamento">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(70px,1fr))', gap: 8 }}>
            {PM.map(p => (
              <button type="button" key={p} onClick={() => setPm(p)}
                      style={{ padding: '10px 4px', borderRadius: 10, border: `2px solid ${pm === p ? '#d81b7a' : '#e8ddd2'}`, background: pm === p ? '#fdeaf3' : '#fff', color: pm === p ? '#d81b7a' : '#22303f', fontWeight: 700, fontSize: 13 }}>
                {p}
              </button>
            ))}
          </div>
        </Field>
        {(pm === 'Débito' || pm === 'Crédito') && (
          <Field label="Maquininha / Operadora">
            <select value={operator} onChange={e => setOperator(e.target.value)} style={input()}>
              {OPERATORS.map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
        )}
        {pm === 'Crédito' && (
          <Field label="Número de parcelas">
            <select value={installments} onChange={e => setInstallments(e.target.value)} style={input()}>
              {Array.from({ length: 12 }, (_, i) => `${i + 1}x`).map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
        )}
        <Field label="Anexar documento (PDF/JPG/PNG)">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} style={input()} />
        </Field>
        <Field label="Observação (opcional)"><textarea rows={2} value={observation} onChange={e => setObservation(e.target.value)} style={input()} /></Field>
        <button type="submit" style={btn()}>REGISTRAR ENTRADA</button>
        {error && <div style={{ color: '#c62828', fontSize: 13, marginTop: 8 }}>{error}</div>}
      </form>

      {confirming && (
        <div style={overlay()}>
          <div style={modal()}>
            <h2 style={{ marginTop: 0 }}>Confirme os dados</h2>
            <p><b>Valor:</b> {formatMoney(parseFloat(amount.replace(',', '.')) || 0)}<br /><b>Forma de pagamento:</b> {pm}</p>
            <p style={{ background: '#fff8e1', border: '1px solid #ffe082', padding: 10, borderRadius: 8, fontSize: 13 }}>
              <b>ATENÇÃO:</b> depois de confirmado, este lançamento não poderá ser editado ou excluído.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirming(false)} style={btn('#fff', '#1b3b5c', true)}>VOLTAR</button>
              <button onClick={confirm} style={btn()}>CONFIRMAR LANÇAMENTO</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1b3b5c', marginBottom: 6 }}>{label}</label>{children}</div>;
}
function input(): React.CSSProperties { return { width: '100%', padding: 12, border: '1.5px solid #e8ddd2', borderRadius: 10, fontSize: 16 }; }
function btn(bg = '#d81b7a', color = '#fff', ghost = false): React.CSSProperties {
  return { width: '100%', padding: '12px 18px', border: ghost ? '1.5px solid #e8ddd2' : 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, background: bg, color };
}
function overlay(): React.CSSProperties { return { position: 'fixed', inset: 0, background: 'rgba(20,20,20,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }; }
function modal(): React.CSSProperties { return { background: '#fff', borderRadius: 16, padding: 20, maxWidth: 420, width: '100%' }; }


