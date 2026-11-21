import { STATUSES } from './constants.js';

/** Agrupa pedidos por status, ordenados pela posição no quadro. */
export function groupByStatus(orders) {
  const groups = Object.fromEntries(STATUSES.map((s) => [s.value, []]));
  orders.forEach((o) => groups[o.status]?.push(o));
  Object.values(groups).forEach((list) => list.sort((a, b) => a.position - b.position || a.id - b.id));
  return groups;
}

/**
 * Move um card para `toStatus` na posição `toIndex` (índice calculado
 * desconsiderando o próprio card) e devolve a lista com posições recalculadas.
 * Espelha a lógica do endpoint PATCH /orders/:id/move.
 */
export function moveCard(orders, id, toStatus, toIndex) {
  const card = orders.find((o) => o.id === id);
  if (!card) return orders;
  const groups = groupByStatus(orders.filter((o) => o.id !== id));
  const target = groups[toStatus];
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, { ...card, status: toStatus });
  return Object.values(groups).flatMap((list) => list.map((o, i) => ({ ...o, position: i })));
}

/**
 * Converte o índice de drop entre os cards *visíveis* (quando há filtro)
 * para o índice na coluna completa, ambos sem o card arrastado.
 */
export function resolveDropIndex(fullColumn, visibleColumn, visibleIndex) {
  if (visibleIndex < visibleColumn.length) {
    return fullColumn.findIndex((o) => o.id === visibleColumn[visibleIndex].id);
  }
  const last = visibleColumn.at(-1);
  return last ? fullColumn.findIndex((o) => o.id === last.id) + 1 : fullColumn.length;
}
