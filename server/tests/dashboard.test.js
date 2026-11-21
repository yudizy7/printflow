import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authenticated, createClient, createOrder, setupApp } from './helpers.js';
import { seedDemo } from '../src/seed-data.js';

describe('Dashboard', () => {
  it('retorna métricas agregadas', async () => {
    const { app } = setupApp();
    const auth = await authenticated(app);
    const client = await createClient(auth);
    await createOrder(auth, client.id, { status: 'producao', quantity: 10, unit_price_cents: 1000 });
    await createOrder(auth, client.id, { status: 'orcamento', quantity: 1, unit_price_cents: 5000 });
    await createOrder(auth, client.id, { status: 'pronto', due_date: '2020-01-01' });

    const res = await auth.get('/api/dashboard');
    assert.equal(res.status, 200);
    const { summary, byStatus, revenueByMonth, upcoming, topClients } = res.body;

    assert.equal(summary.active_orders, 3);
    assert.equal(summary.in_production, 1);
    assert.equal(summary.ready_orders, 1);
    assert.equal(summary.overdue_orders, 1);
    assert.equal(summary.clients, 1);
    assert.equal(summary.revenue_month_cents, 10000 + 15000);
    assert.equal(summary.pipeline_cents, 5000);
    assert.equal(byStatus.length, 6);
    assert.equal(revenueByMonth.length, 6);
    assert.equal(revenueByMonth.at(-1).total_cents, 25000);
    assert.equal(upcoming.length, 1);
    assert.equal(topClients[0].name, 'Café Aroma');
  });

  it('funciona com os dados de demonstração', async () => {
    const { app, db, api } = setupApp();
    await seedDemo(db);
    const login = await api.post('/api/auth/login').send({ email: 'demo@printflow.com', password: 'demo123' });
    assert.equal(login.status, 200);
    const res = await api.get('/api/dashboard').set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.summary.active_orders > 0);
    assert.ok(app);
  });
});

describe('API', () => {
  it('health check e 404 em rotas desconhecidas', async () => {
    const { api } = setupApp();
    assert.equal((await api.get('/api/health')).body.status, 'ok');
    assert.equal((await api.get('/api/nao-existe')).status, 404);
  });
});
