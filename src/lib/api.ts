export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro inesperado.');
  return data;
}

export function formatMoney(n: number) {
  return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata para DD/MM/AAAA. Uma data "AAAA-MM-DD" (sem hora, como transaction_date
// do banco) é lida literalmente, sem passar por fuso horário — isso evita o bug
// clássico de "new Date('2026-10-08')" virar 07/10 na tela de quem está no Brasil
// (o navegador interpreta a string como meia-noite UTC e depois volta 3h pro
// fuso local, caindo no dia anterior).
export function formatDate(d: string | Date) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// "Hoje" sempre no horário de Brasília — nunca em UTC. O servidor (Vercel) roda
// em UTC, então sem isso, entre ~21h e 23h59 no horário de Brasília o sistema
// já considera "hoje" como o dia seguinte, causando totais errados e bloqueios
// indevidos para quem lança fora do horário comercial.
export function todayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
