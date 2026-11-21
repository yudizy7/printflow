const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 12345 -> "R$ 123,45" */
export function formatCurrency(cents) {
  return currency.format((Number(cents) || 0) / 100);
}

export function formatCompactCurrency(cents) {
  return compactCurrency.format((Number(cents) || 0) / 100);
}

/** "123,45" | "1.234,5" | "12.5" -> centavos inteiros */
export function parseCurrencyToCents(value) {
  if (typeof value === 'number') return Math.round(value * 100);
  if (!value) return 0;
  let str = String(value).replace(/[^\d,.-]/g, '');
  if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(str);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** centavos -> "123,45" (para inputs) */
export function centsToInput(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',');
}

/** Converte "AAAA-MM-DD" ou "AAAA-MM-DD HH:MM:SS" em Date local. */
export function parseDate(value) {
  if (!value) return null;
  const [datePart, timePart = '00:00:00'] = String(value).split(/[ T]/);
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

export function formatDate(value) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

export function formatDateTime(value) {
  const d = parseDate(value);
  return d ? `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—';
}

export function todayISO(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Diferença em dias entre a data de entrega e hoje (negativo = atrasado). */
export function daysUntil(dateStr, now = new Date()) {
  if (!dateStr) return null;
  const due = parseDate(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86_400_000);
}

export function isOverdue(order, now = new Date()) {
  const diff = daysUntil(order?.due_date, now);
  return diff !== null && diff < 0 && order.status !== 'entregue';
}

/** Texto amigável para prazo: "Hoje", "Amanhã", "Em 3 dias", "Atrasado 2 dias". */
export function dueLabel(dateStr, now = new Date()) {
  const diff = daysUntil(dateStr, now);
  if (diff === null) return 'Sem prazo';
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff > 1) return `Em ${diff} dias`;
  if (diff === -1) return 'Atrasado 1 dia';
  return `Atrasado ${Math.abs(diff)} dias`;
}

export function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
