'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, formatMoney } from '@/lib/api';
import { Shell, Field, input, btn, overlay, modal } from '@/components/ui';

const PM = ['Dinheiro', 'PIX', 'Cartão', 'Boleto'];
const OPERATORS = ['Stone', 'Cielo', 'Rede', 'PagSeguro', 'Mercado Pago', 'Outra'];

export default function NovoCustoPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [role, setRole] = useState<'ADMIN' | 'FUNC' | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
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

  useEffect(() => {
    apiFetch('/api/me').then(u => setRole(u.role)).catch(() => router.push('/login'));
    apiFetch('/api/categories').then((rows: any[]) => {
      const active = rows.filter(r => r.type === 'CUSTO' && r.active).map(r => r.name);
      setCategories(active);
      if (active[0]) setCategory(active[0]);
    });
  }, [router]);

  function openConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const val = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (!val || val <= 0) { setError('Informe um valor válido.'); return; }
    if (!pm) { setError('Selecione a forma de pagamento.'); return; }
    if (!supplier.trim()) { setError('Informe o fornecedor.'); return; }
    setConfirming(true);
  }

  async function confirm() {
    const val = parseFloat(amount.replace(/[^\d,.-]/g, '').replace(',', '.'));
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'CUSTO', amount: val, payment_method: pm, category, supplier, invoice_number: invoice,
          operator: pm === 'Cartão' ? operator : null,
          installments: pm === 'Cartão' ? parseInt(installments) : null,
          description, observation, transaction_date: today,
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
      <Shell role={role} active="/novo-custo">
        <div style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <h2>Custo registrado com sucesso!</h2>
          <p>Lançamento #{String(success).padStart(6, '0')}</p>
          {docWarning && <p style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#c62828', padding: 10, borderRadius: 8, fontSize: 13 }}>{docWarning}</p>}
          <button onClick={() => router.push('/dashboard')} style={btn()}>Voltar ao início</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role={role} active="/novo-custo">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1>Novo Custo</h1>
        <form onSubmit={openConfirm} style={{ background: '#fff', border: '1px solid #e8ddd2', borderRadius: 14, padding: 16 }}>
          <Field label="Fornecedor"><input value={supplier} onChange={e => setSupplier(e.target.value)} style={input()} /></Field>
          <Field label="Descrição"><input value={description} onChange={e => setDescription(e.target.value)} style={input()} /></Field>
          <Field label="Valor"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" style={input()} /></Field>
          <Field label="Categoria">
            <select value={category} onChange={e => setCategory(e.target.value)} style={input()}>{categories.map(c => <option key={c}>{c}</option>)}</select>
          </Field>
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
          {(pm === 'Cartão') && (
            <Field label="Maquininha / Operadora"><select value={operator} onChange={e => setOperator(e.target.value)} style={input()}>{OPERATORS.map(o => <option key={o}>{o}</option>)}</select></Field>
          )}
          {pm === 'Cartão' && (
            <Field label="Número de parcelas"><select value={installments} onChange={e => setInstallments(e.target.value)} style={input()}>{Array.from({ length: 12 }, (_, i) => `${i + 1}x`).map(p => <option key={p}>{p}</option>)}</select></Field>
          )}
          <Field label="Número da nota (opcional)"><input value={invoice} onChange={e => setInvoice(e.target.value)} style={input()} /></Field>
          <Field label="Anexar documento (PDF/JPG/PNG)">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} style={input()} />
          </Field>
          <Field label="Observação (opcional)"><textarea rows={2} value={observation} onChange={e => setObservation(e.target.value)} style={input()} /></Field>
          <button type="submit" style={{ ...btn(), width: '100%' }}>REGISTRAR CUSTO</button>
          {error && <div style={{ color: '#c62828', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </form>

        {confirming && (
          <div style={overlay()}>
            <div style={modal()}>
              <h2 style={{ marginTop: 0 }}>Confirme os dados</h2>
              <p><b>Fornecedor:</b> {supplier}<br /><b>Valor:</b> {formatMoney(parseFloat(amount.replace(',', '.')) || 0)}<br /><b>Forma de pagamento:</b> {pm}</p>
              <p style={{ background: '#fff8e1', border: '1px solid #ffe082', padding: 10, borderRadius: 8, fontSize: 13 }}>
                <b>ATENÇÃO:</b> depois de confirmado, este lançamento (e o documento anexado) não poderão ser editados ou excluídos.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirming(false)} style={{ ...btn('', '', true), flex: 1 }}>VOLTAR</button>
                <button onClick={confirm} style={{ ...btn(), flex: 1 }}>CONFIRMAR LANÇAMENTO</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
