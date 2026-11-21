import { createDatabase } from './db.js';
import { seedDemo } from './seed-data.js';

// Recria os dados de demonstração (apaga dados existentes!)
const db = createDatabase();
db.exec('DELETE FROM order_history; DELETE FROM orders; DELETE FROM clients; DELETE FROM users;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('order_history','orders','clients','users');");
await seedDemo(db);
db.close();

console.log('🌱 Banco populado com sucesso!');
console.log('   Login: demo@printflow.com');
console.log('   Senha: demo123');
