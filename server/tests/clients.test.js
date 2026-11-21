import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authenticated, createClient, createOrder, setupApp } from './helpers.js';

describe('Clientes', () => {
  let auth;

  beforeEach(async () => {
    const { app } = setupApp();
    auth = await authenticated(app);
  });

  it('cria cliente normalizando campos opcionais', async () => {
    const res = await auth.post('/api/clients').send({ name: '  Studio Bella ', email: 'CONTATO@Bella.com', phone: '' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Studio Bella');
    assert.equal(res.body.email, 'contato@bella.com');
    assert.equal(res.body.phone, null);
    assert.equal(res.body.orders_count, 0);
  });

  it('valida nome e e-mail', async () => {
    const res = await auth.post('/api/clients').send({ name: 'X', email: 'nao-e-email' });
    assert.equal(res.status, 400);
  });

  it('lista e busca clientes', async () => {
    await createClient(auth, { name: 'Café Aroma' });
    await createClient(auth, { name: 'Academia Movimento', company: 'Movimento Fitness' });
    const all = await auth.get('/api/clients');
    assert.equal(all.body.length, 2);
    const filtered = await auth.get('/api/clients?q=fitness');
    assert.equal(filtered.body.length, 1);
    assert.equal(filtered.body[0].name, 'Academia Movimento');
  });

  it('atualiza cliente e retorna 404 para inexistente', async () => {
    const client = await createClient(auth);
    const res = await auth.put(`/api/clients/${client.id}`).send({ name: 'Café Aroma Premium' });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Café Aroma Premium');
    assert.equal((await auth.put('/api/clients/999').send({ name: 'Fantasma' })).status, 404);
  });

  it('detalhe inclui pedidos e totais', async () => {
    const client = await createClient(auth);
    await createOrder(auth, client.id, { quantity: 10, unit_price_cents: 1000 });
    const res = await auth.get(`/api/clients/${client.id}`);
    assert.equal(res.body.orders.length, 1);
    assert.equal(res.body.orders_count, 1);
    assert.equal(res.body.total_cents, 10000);
  });

  it('impede exclusão de cliente com pedidos', async () => {
    const client = await createClient(auth);
    await createOrder(auth, client.id);
    const res = await auth.delete(`/api/clients/${client.id}`);
    assert.equal(res.status, 409);
  });

  it('exclui cliente sem pedidos', async () => {
    const client = await createClient(auth);
    assert.equal((await auth.delete(`/api/clients/${client.id}`)).status, 204);
    assert.equal((await auth.get(`/api/clients/${client.id}`)).status, 404);
  });
});
