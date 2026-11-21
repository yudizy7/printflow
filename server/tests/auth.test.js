import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupApp } from './helpers.js';

describe('Autenticação', () => {
  let api;
  const user = { name: 'Ana', email: 'ana@printflow.com', password: 'segredo123' };

  beforeEach(() => {
    ({ api } = setupApp());
  });

  it('registra o primeiro usuário como admin e retorna token', async () => {
    const res = await api.post('/api/auth/register').send(user);
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, user.email);
    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.password_hash, undefined, 'não deve expor o hash da senha');
  });

  it('segundo usuário recebe papel de operador', async () => {
    await api.post('/api/auth/register').send(user);
    const res = await api.post('/api/auth/register').send({ ...user, email: 'bia@printflow.com' });
    assert.equal(res.body.user.role, 'operador');
  });

  it('rejeita e-mail duplicado (case-insensitive)', async () => {
    await api.post('/api/auth/register').send(user);
    const res = await api.post('/api/auth/register').send({ ...user, email: 'ANA@printflow.com' });
    assert.equal(res.status, 409);
  });

  it('valida dados de cadastro', async () => {
    const res = await api.post('/api/auth/register').send({ name: 'A', email: 'invalido', password: '123' });
    assert.equal(res.status, 400);
    const fields = res.body.details.map((d) => d.field);
    assert.deepEqual(fields.sort(), ['email', 'name', 'password']);
  });

  it('faz login com credenciais corretas', async () => {
    await api.post('/api/auth/register').send(user);
    const res = await api.post('/api/auth/login').send({ email: user.email, password: user.password });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  it('recusa senha incorreta', async () => {
    await api.post('/api/auth/register').send(user);
    const res = await api.post('/api/auth/login').send({ email: user.email, password: 'errada' });
    assert.equal(res.status, 401);
  });

  it('GET /me retorna o usuário autenticado', async () => {
    const { body } = await api.post('/api/auth/register').send(user);
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Ana');
  });

  it('bloqueia rotas protegidas sem token ou com token inválido', async () => {
    assert.equal((await api.get('/api/orders')).status, 401);
    assert.equal((await api.get('/api/clients').set('Authorization', 'Bearer xyz')).status, 401);
  });
});
