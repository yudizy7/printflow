import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './errors.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { ordersRouter } from './routes/orders.js';
import { dashboardRouter } from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ db, jwtSecret, serveClient = true }) {
  if (!db) throw new Error('createApp: "db" é obrigatório');
  if (!jwtSecret) throw new Error('createApp: "jwtSecret" é obrigatório');

  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const auth = requireAuth(jwtSecret);
  app.use('/api/auth', authRouter({ db, jwtSecret }));
  app.use('/api/clients', auth, clientsRouter(db));
  app.use('/api/orders', auth, ordersRouter(db));
  app.use('/api/dashboard', auth, dashboardRouter(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

  // Em produção, serve o build do React (client/dist) pelo mesmo servidor.
  const dist = path.resolve(__dirname, '../../client/dist');
  if (serveClient && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/.*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
