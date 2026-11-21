import { describe, expect, it } from 'vitest';
import { groupByStatus, moveCard, resolveDropIndex } from '../lib/kanban.js';

const orders = [
  { id: 1, status: 'producao', position: 0 },
  { id: 2, status: 'producao', position: 1 },
  { id: 3, status: 'aprovado', position: 0 },
  { id: 4, status: 'producao', position: 2 },
];

const ids = (list) => list.map((o) => o.id);

describe('kanban', () => {
  it('agrupa por status ordenando pela posição', () => {
    const g = groupByStatus(orders);
    expect(ids(g.producao)).toEqual([1, 2, 4]);
    expect(ids(g.aprovado)).toEqual([3]);
    expect(g.entregue).toEqual([]);
  });

  it('move card para outra coluna na posição indicada', () => {
    const g = groupByStatus(moveCard(orders, 3, 'producao', 1));
    expect(ids(g.producao)).toEqual([1, 3, 2, 4]);
    expect(g.producao.map((o) => o.position)).toEqual([0, 1, 2, 3]);
    expect(g.aprovado).toEqual([]);
  });

  it('reordena dentro da mesma coluna', () => {
    const g = groupByStatus(moveCard(orders, 1, 'producao', 99));
    expect(ids(g.producao)).toEqual([2, 4, 1]);
  });

  it('mapeia índice visível (filtrado) para índice real', () => {
    const full = [{ id: 1 }, { id: 2 }, { id: 4 }];
    const visible = [{ id: 2 }];
    expect(resolveDropIndex(full, visible, 0)).toBe(1); // antes do 2
    expect(resolveDropIndex(full, visible, 1)).toBe(2); // depois do 2
    expect(resolveDropIndex(full, [], 0)).toBe(3);
  });
});
