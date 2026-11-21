import { createApp } from './app.js';
import { createDatabase } from './db.js';
import { seedDemo } from './seed-data.js';

const PORT = Number(process.env.PORT) || 3333;
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? null : 'dev-secret-troque-em-producao');

if (!JWT_SECRET) {
  console.error('❌ Defina a variável JWT_SECRET em produção.');
  process.exit(1);
}

const db = createDatabase();

if (process.env.SEED_DEMO === 'true' && db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  await seedDemo(db);
  console.log('🌱 Dados de demonstração criados (demo@printflow.com / demo123)');
}

createApp({ db, jwtSecret: JWT_SECRET }).listen(PORT, () => {
  console.log(`🖨️  PrintFlow API rodando em http://localhost:${PORT}`);
});
