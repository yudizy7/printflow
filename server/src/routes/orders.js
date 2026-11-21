import { Router } from 'express';
import { transaction, ORDER_STATUSES, PRIORITIES } from '../db.js';
import { HttpError, parseId } from '../errors.js';
import { moveSchema, orderSchema } from '../validation.js';

const BASE_SELECT = `
  SELECT o.*, c.name AS client_name, c.company AS client_company, u.name AS created_by_name
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.created_by`;

export function ordersRouter(db) {
  const router = Router();

  const getOrder = (id) => {
    const order = db.prepare(`${BASE_SELECT} WHERE o.id = ?`).get(id);
    if (!order) throw new HttpError(404, 'Pedido não encontrado');
    return order;
  };

  const ensureClient = (clientId) => {
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)) {
      throw new HttpError(400, 'Cliente informado não existe');
    }
  };

  const nextPosition = (status) =>
    db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM orders WHERE status = ?').get(status).p;

  const addHistory = (orderId, from, to, userId) =>
    db
      .prepare('INSERT INTO order_history (order_id, from_status, to_status, user_id) VALUES (?, ?, ?, ?)')
      .run(orderId, from, to, userId);

  /** Reescreve as posições de uma coluna sequencialmente (0..n). */
  const reindexColumn = (status) => {
    const ids = db.prepare('SELECT id FROM orders WHERE status = ? ORDER BY position, id').all(status);
    const upd = db.prepare('UPDATE orders SET position = ? WHERE id = ?');
    ids.forEach((row, i) => upd.run(i, row.id));
  };

  router.get('/', (req, res) => {
    const where = [];
    const params = [];
    const { status, priority, client_id: clientId, q, overdue, sort } = req.query;

    if (status) {
      if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Status inválido');
      where.push('o.status = ?');
      params.push(status);
    }
    if (priority) {
      if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'Prioridade inválida');
      where.push('o.priority = ?');
      params.push(priority);
    }
    if (clientId) {
      where.push('o.client_id = ?');
      params.push(parseId(clientId));
    }
    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      where.push('(o.title LIKE ? OR o.code LIKE ? OR c.name LIKE ? OR o.product_type LIKE ?)');
      params.push(like, like, like, like);
    }
    if (overdue === 'true') {
      where.push("o.due_date < date('now', 'localtime') AND o.status <> 'entregue'");
    }

    const orderBy = sort === 'position' ? 'o.position, o.id' : 'o.created_at DESC, o.id DESC';
    const sql = `${BASE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/:id', (req, res) => {
    const order = getOrder(parseId(req.params.id));
    const history = db
      .prepare(
        `SELECT h.id, h.from_status, h.to_status, h.created_at, u.name AS user_name
           FROM order_history h LEFT JOIN users u ON u.id = h.user_id
          WHERE h.order_id = ? ORDER BY h.created_at DESC, h.id DESC`
      )
      .all(order.id);
    res.json({ ...order, history });
  });

  router.post('/', (req, res) => {
    const d = orderSchema.parse(req.body);
    ensureClient(d.client_id);
    const status = d.status ?? 'orcamento';
    const priority = d.priority ?? 'media';

    const id = transaction(db, () => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO orders (client_id, title, description, product_type, quantity, unit_price_cents,
                               status, priority, due_date, position, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          d.client_id, d.title, d.description, d.product_type, d.quantity, d.unit_price_cents,
          status, priority, d.due_date, nextPosition(status), req.user.id
        );
      const newId = Number(lastInsertRowid);
      db.prepare('UPDATE orders SET code = ? WHERE id = ?').run(`PF-${String(newId).padStart(5, '0')}`, newId);
      addHistory(newId, null, status, req.user.id);
      return newId;
    });

    res.status(201).json(getOrder(id));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const current = getOrder(id);
    const d = orderSchema.parse(req.body);
    ensureClient(d.client_id);
    const status = d.status ?? current.status;
    const priority = d.priority ?? current.priority;

    transaction(db, () => {
      const statusChanged = status !== current.status;
      db.prepare(
        `UPDATE orders SET client_id = ?, title = ?, description = ?, product_type = ?, quantity = ?,
                unit_price_cents = ?, status = ?, priority = ?, due_date = ?, position = ?,
                updated_at = datetime('now', 'localtime')
          WHERE id = ?`
      ).run(
        d.client_id, d.title, d.description, d.product_type, d.quantity, d.unit_price_cents,
        status, priority, d.due_date, statusChanged ? nextPosition(status) : current.position, id
      );
      if (statusChanged) {
        reindexColumn(current.status);
        addHistory(id, current.status, status, req.user.id);
      }
    });

    res.json(getOrder(id));
  });

  /** Move um pedido no Kanban (troca de coluna e/ou reordenação). */
  router.patch('/:id/move', (req, res) => {
    const id = parseId(req.params.id);
    const current = getOrder(id);
    const { status, position } = moveSchema.parse(req.body);

    transaction(db, () => {
      const ids = db
        .prepare('SELECT id FROM orders WHERE status = ? AND id <> ? ORDER BY position, id')
        .all(status, id)
        .map((r) => r.id);
      ids.splice(Math.min(position, ids.length), 0, id);

      const updPos = db.prepare('UPDATE orders SET position = ? WHERE id = ?');
      ids.forEach((orderId, i) => {
        if (orderId === id) {
          db.prepare("UPDATE orders SET status = ?, position = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
            .run(status, i, id);
        } else {
          updPos.run(i, orderId);
        }
      });

      if (current.status !== status) {
        reindexColumn(current.status);
        addHistory(id, current.status, status, req.user.id);
      }
    });

    res.json(getOrder(id));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const current = getOrder(id);
    transaction(db, () => {
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);
      reindexColumn(current.status);
    });
    res.status(204).end();
  });

  return router;
}
