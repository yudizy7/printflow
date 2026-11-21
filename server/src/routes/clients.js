import { Router } from 'express';
import { HttpError, parseId } from '../errors.js';
import { clientSchema } from '../validation.js';

export function clientsRouter(db) {
  const router = Router();

  const getClient = (id) => {
    const client = db
      .prepare(
        `SELECT c.*, COUNT(o.id) AS orders_count, COALESCE(SUM(o.total_cents), 0) AS total_cents
           FROM clients c LEFT JOIN orders o ON o.client_id = c.id
          WHERE c.id = ? GROUP BY c.id`
      )
      .get(id);
    if (!client) throw new HttpError(404, 'Cliente não encontrado');
    return client;
  };

  router.get('/', (req, res) => {
    const q = String(req.query.q || '').trim();
    const like = `%${q}%`;
    const rows = db
      .prepare(
        `SELECT c.*, COUNT(o.id) AS orders_count, COALESCE(SUM(o.total_cents), 0) AS total_cents
           FROM clients c LEFT JOIN orders o ON o.client_id = c.id
          WHERE (? = '' OR c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ? OR c.document LIKE ?)
          GROUP BY c.id
          ORDER BY c.name COLLATE NOCASE`
      )
      .all(q, like, like, like, like);
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const client = getClient(parseId(req.params.id));
    const orders = db
      .prepare(
        `SELECT id, code, title, status, priority, total_cents, due_date, created_at
           FROM orders WHERE client_id = ? ORDER BY created_at DESC LIMIT 20`
      )
      .all(client.id);
    res.json({ ...client, orders });
  });

  router.post('/', (req, res) => {
    const d = clientSchema.parse(req.body);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO clients (name, company, email, phone, document, city, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(d.name, d.company, d.email, d.phone, d.document, d.city, d.notes);
    res.status(201).json(getClient(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const d = clientSchema.parse(req.body);
    const { changes } = db
      .prepare(
        `UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, document = ?, city = ?, notes = ?,
                updated_at = datetime('now', 'localtime')
          WHERE id = ?`
      )
      .run(d.name, d.company, d.email, d.phone, d.document, d.city, d.notes, id);
    if (!changes) throw new HttpError(404, 'Cliente não encontrado');
    res.json(getClient(id));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE client_id = ?').get(id);
    if (n > 0) throw new HttpError(409, `Cliente possui ${n} pedido(s) vinculado(s) e não pode ser excluído`);
    const { changes } = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    if (!changes) throw new HttpError(404, 'Cliente não encontrado');
    res.status(204).end();
  });

  return router;
}
