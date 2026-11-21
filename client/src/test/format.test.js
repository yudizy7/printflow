import { describe, expect, it } from 'vitest';
import {
  centsToInput,
  daysUntil,
  dueLabel,
  formatCurrency,
  initials,
  isOverdue,
  parseCurrencyToCents,
} from '../lib/format.js';

const NOW = new Date(2026, 10, 20, 10, 0); // 20/11/2026

describe('formatação de moeda', () => {
  it('formata centavos em BRL', () => {
    expect(formatCurrency(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(formatCurrency(null).replace(/\s/g, ' ')).toBe('R$ 0,00');
  });

  it('converte texto em centavos', () => {
    expect(parseCurrencyToCents('1.234,56')).toBe(123456);
    expect(parseCurrencyToCents('0,18')).toBe(18);
    expect(parseCurrencyToCents('12.5')).toBe(1250);
    expect(parseCurrencyToCents('R$ 45,00')).toBe(4500);
    expect(parseCurrencyToCents('')).toBe(0);
    expect(parseCurrencyToCents('abc')).toBe(0);
  });

  it('converte centavos para input', () => {
    expect(centsToInput(1850)).toBe('18,50');
  });
});

describe('prazos', () => {
  it('calcula dias até a entrega', () => {
    expect(daysUntil('2026-11-20', NOW)).toBe(0);
    expect(daysUntil('2026-11-25', NOW)).toBe(5);
    expect(daysUntil('2026-11-18', NOW)).toBe(-2);
    expect(daysUntil(null, NOW)).toBeNull();
  });

  it('gera rótulos amigáveis', () => {
    expect(dueLabel('2026-11-20', NOW)).toBe('Hoje');
    expect(dueLabel('2026-11-21', NOW)).toBe('Amanhã');
    expect(dueLabel('2026-11-23', NOW)).toBe('Em 3 dias');
    expect(dueLabel('2026-11-19', NOW)).toBe('Atrasado 1 dia');
    expect(dueLabel('2026-11-10', NOW)).toBe('Atrasado 10 dias');
    expect(dueLabel(null, NOW)).toBe('Sem prazo');
  });

  it('pedido entregue nunca está atrasado', () => {
    expect(isOverdue({ due_date: '2026-11-01', status: 'producao' }, NOW)).toBe(true);
    expect(isOverdue({ due_date: '2026-11-01', status: 'entregue' }, NOW)).toBe(false);
  });
});

describe('initials', () => {
  it('retorna as iniciais', () => {
    expect(initials('Café Aroma Ltda')).toBe('CA');
    expect(initials('')).toBe('');
  });
});
