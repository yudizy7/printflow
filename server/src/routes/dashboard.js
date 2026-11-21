import { Router } from 'express';
import { ORDER_STATUSES } from '../db.js';

function lastMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function dashboardRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const summary = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM orders WHERE status <> 'entregue') AS active_orders,
           (SELECT COUNT(*) FROM orders WHERE status IN ('producao', 'acabamento')) AS in_production,
           (SELECT COUNT(*) FROM orders WHERE status = 'pronto') AS ready_orders,
           (SELECT COUNT(*) FROM orders
              WHERE due_date < date('now', 'localtime') AND status <> 'entregue') AS overdue_orders,
           (SELECT COUNT(*) FROM clients) AS clients,
           (SELECT COALESCE(SUM(total_cents), 0) FROM orders
              WHERE status <> 'orcamento'
                AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')) AS revenue_month_cents,
           (SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status = 'orcamento') AS pipeline_cents`
      )
      .get();

    const statusRows = db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all();
    const byStatus = ORDER_STATUSES.map((status) => ({
      status,
      count: statusRows.find((r) => r.status === status)?.count ?? 0,
    }));

    const months = lastMonths(6);
    const revenueRows = db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) AS month, COALESCE(SUM(total_cents), 0) AS total_cents,
                COUNT(*) AS orders
           FROM orders
          WHERE status <> 'orcamento' AND strftime('%Y-%m', created_at) >= ?
          GROUP BY month`
      )
      .all(months[0]);
    const revenueByMonth = months.map((month) => {
      const row = revenueRows.find((r) => r.month === month);
      return { month, total_cents: row?.total_cents ?? 0, orders: row?.orders ?? 0 };
    });

    const upcoming = db
      .prepare(
        `SELECT o.id, o.code, o.title, o.status, o.priority, o.due_date, o.total_cents, c.name AS client_name
           FROM orders o JOIN clients c ON c.id = o.client_id
          WHERE o.status <> 'entregue' AND o.due_date IS NOT NULL
          ORDER BY o.due_date ASC LIMIT 6`
      )
      .all();

    const topClients = db
      .prepare(
        `SELECT c.id, c.name, c.company, COUNT(o.id) AS orders, COALESCE(SUM(o.total_cents), 0) AS total_cents
           FROM clients c JOIN orders o ON o.client_id = c.id
          WHERE o.status <> 'orcamento'
          GROUP BY c.id ORDER BY total_cents DESC LIMIT 5`
      )
      .all();

    const recent = db
      .prepare(
        `SELECT o.id, o.code, o.title, o.status, o.total_cents, o.created_at, c.name AS client_name
           FROM orders o JOIN clients c ON c.id = o.client_id
          ORDER BY o.created_at DESC, o.id DESC LIMIT 5`
      )
      .all();

    res.json({ summary, byStatus, revenueByMonth, upcoming, topClients, recent });
  });

  return router;
}
