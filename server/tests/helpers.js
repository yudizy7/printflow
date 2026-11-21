import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';

export const JWT_SECRET = 'test-secret';

/** Cria app com banco em memória isolado para cada suíte. */
export function setupApp() {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: JWT_SECRET, serveClient: false });
  return { db, app, api: request(app) };
}

/** Registra um usuário e devolve um agente autenticado. */
export async function authenticated(app, overrides = {}) {
  const user = { name: 'Ana Gráfica', email: 'ana@printflow.com', password: 'segredo123', ...overrides };
  const res = await request(app).post('/api/auth/register').send(user);
  const token = res.body.token;
  const withAuth = (method) => (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  return {
    token,
    user: res.body.user,
    get: withAuth('get'),
    post: withAuth('post'),
    put: withAuth('put'),
    patch: withAuth('patch'),
    delete: withAuth('delete'),
  };
}

export async function createClient(auth, data = {}) {
  const res = await auth.post('/api/clients').send({ name: 'Café Aroma', company: 'Café Aroma Ltda', ...data });
  return res.body;
}

export async function createOrder(auth, clientId, data = {}) {
  const res = await auth.post('/api/orders').send({
    client_id: clientId,
    title: 'Cartões de visita',
    product_type: 'Cartão de visita',
    quantity: 1000,
    unit_price_cents: 15,
    ...data,
  });
  return res.body;
}
