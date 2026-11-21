import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authenticated, createClient, createOrder, setupApp } from './helpers.js';

describe('Pedidos', () => {
  let auth;
  let client;

  beforeEach(async () => {
    const { app } = setupApp();
    auth = await authenticated(app);
    client = await createClient(auth);
  });

  it('cria pedido com código, total calculado e histórico inicial', async () => {
    const res = await auth.post('/api/orders').send({
      client_id: client.id,
      title: 'Banner fachada',
      product_type: 'Banner',
      quantity: 3,
      unit_price_cents: 15000,
      due_date: '2026-12-01',
    });
    assert.equal(res.status, 201);
    assert.match(res.body.code, /^PF-\d{5}$/);
    assert.equal(res.body.total_cents, 45000);
    assert.equal(res.body.status, 'orcamento');
    assert.equal(res.body.priority, 'media');
    assert.equal(res.body.client_name, 'Café Aroma');

    const detail = await auth.get(`/api/orders/${res.body.id}`);
    assert.equal(detail.body.history.length, 1);
    assert.equal(detail.body.history[0].to_status, 'orcamento');
  });

  it('valida campos obrigatórios e cliente inexistente', async () => {
    const invalid = await auth.post('/api/orders').send({ title: 'x', quantity: 0 });
    assert.equal(invalid.status, 400);
    const noClient = await auth.post('/api/orders').send({
      client_id: 999, title: 'Flyer', product_type: 'Flyer', quantity: 1, unit_price_cents: 1,
    });
    assert.equal(noClient.status, 400);
  });

  it('filtra por status e busca textual', async () => {
    await createOrder(auth, client.id, { title: 'Flyers de verão', status: 'producao' });
    await createOrder(auth, client.id, { title: 'Etiquetas', status: 'aprovado' });
    const byStatus = await auth.get('/api/orders?status=producao');
    assert.equal(byStatus.body.length, 1);
    assert.equal(byStatus.body[0].title, 'Flyers de verão');
    const byText = await auth.get('/api/orders?q=etiq');
    assert.equal(byText.body.length, 1);
    assert.equal((await auth.get('/api/orders?status=invalido')).status, 400);
  });

  it('lista apenas pedidos atrasados com overdue=true', async () => {
    await createOrder(auth, client.id, { title: 'Atrasado', due_date: '2020-01-01' });
    await createOrder(auth, client.id, { title: 'Atrasado mas entregue', due_date: '2020-01-01', status: 'entregue' });
    await createOrder(auth, client.id, { title: 'No prazo', due_date: '2999-01-01' });
    const res = await auth.get('/api/orders?overdue=true');
    assert.deepEqual(res.body.map((o) => o.title), ['Atrasado']);
  });

  it('atualiza pedido e registra troca de status no histórico', async () => {
    const order = await createOrder(auth, client.id);
    const res = await auth.put(`/api/orders/${order.id}`).send({
      client_id: client.id, title: 'Cartões atualizados', product_type: 'Cartão de visita',
      quantity: 2000, unit_price_cents: 12, status: 'aprovado', priority: 'alta',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.total_cents, 24000);
    assert.equal(res.body.status, 'aprovado');
    const detail = await auth.get(`/api/orders/${order.id}`);
    assert.equal(detail.body.history.length, 2);
    assert.equal(detail.body.history[0].from_status, 'orcamento');
    assert.equal(detail.body.history[0].to_status, 'aprovado');
  });

  it('move pedidos no Kanban mantendo a ordem das colunas', async () => {
    const a = await createOrder(auth, client.id, { title: 'Pedido A', status: 'producao' });
    const b = await createOrder(auth, client.id, { title: 'Pedido B', status: 'producao' });
    const c = await createOrder(auth, client.id, { title: 'Pedido C', status: 'aprovado' });

    // Move C para o topo da coluna "producao"
    const res = await auth.patch(`/api/orders/${c.id}/move`).send({ status: 'producao', position: 0 });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'producao');

    const column = await auth.get('/api/orders?status=producao&sort=position');
    assert.deepEqual(column.body.map((o) => o.title), ['Pedido C', 'Pedido A', 'Pedido B']);
    assert.deepEqual(column.body.map((o) => o.position), [0, 1, 2]);

    // Reordena dentro da mesma coluna: A vai para o final
    await auth.patch(`/api/orders/${a.id}/move`).send({ status: 'producao', position: 99 });
    const reordered = await auth.get('/api/orders?status=producao&sort=position');
    assert.deepEqual(reordered.body.map((o) => o.title), ['Pedido C', 'Pedido B', 'Pedido A']);

    const history = (await auth.get(`/api/orders/${c.id}`)).body.history;
    assert.equal(history[0].to_status, 'producao');
    assert.ok(b.id);
  });

  it('exclui pedido', async () => {
    const order = await createOrder(auth, client.id);
    assert.equal((await auth.delete(`/api/orders/${order.id}`)).status, 204);
    assert.equal((await auth.get(`/api/orders/${order.id}`)).status, 404);
  });
});
