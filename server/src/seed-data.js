import bcrypt from 'bcryptjs';
import { transaction } from './db.js';

const CLIENTS = [
  ['Mariana Costa', 'Café Aroma Ltda', 'contato@cafearoma.com.br', '(11) 98877-1020', '12.345.678/0001-90', 'São Paulo - SP'],
  ['Ricardo Alves', 'Imobiliária Horizonte', 'ricardo@horizonteimoveis.com.br', '(11) 97766-3344', '23.456.789/0001-01', 'Campinas - SP'],
  ['Juliana Prado', 'Studio Bella Estética', 'juliana@studiobella.com', '(21) 99654-7788', '345.678.901-23', 'Rio de Janeiro - RJ'],
  ['Fernando Lima', 'Academia Movimento', 'fernando@academiamovimento.com.br', '(31) 98543-2211', '34.567.890/0001-12', 'Belo Horizonte - MG'],
  ['Patrícia Souza', 'Padaria Pão Dourado', 'patricia@paodourado.com.br', '(41) 99432-5566', '45.678.901/0001-23', 'Curitiba - PR'],
  ['Dr. André Moreira', 'Clínica Sorriso', 'andre@clinicasorriso.com.br', '(51) 98321-9900', '56.789.012/0001-34', 'Porto Alegre - RS'],
  ['Camila Ribeiro', 'Escola Pequeno Saber', 'secretaria@pequenosaber.edu.br', '(11) 97210-4433', '67.890.123/0001-45', 'Santo André - SP'],
  ['Bruno Teixeira', 'Cervejaria Lúpulo Bravo', 'bruno@lupulobravo.com.br', '(48) 99109-8877', '78.901.234/0001-56', 'Florianópolis - SC'],
];

// [clientIndex, title, product, qty, unitPriceCents, status, priority, dueOffsetDays, createdDaysAgo]
const ORDERS = [
  [0, 'Cartões de visita — equipe comercial', 'Cartão de visita', 1000, 18, 'producao', 'alta', 2, 3],
  [0, 'Cardápio A3 plastificado', 'Cardápio', 40, 2500, 'aprovado', 'media', 6, 2],
  [1, 'Banner fachada 3x1m lona 440g', 'Banner', 2, 18000, 'acabamento', 'urgente', 1, 5],
  [1, 'Folder imóveis lançamento', 'Folder', 5000, 45, 'orcamento', 'media', 15, 1],
  [2, 'Flyers promoção de verão', 'Flyer', 2500, 22, 'pronto', 'media', 0, 7],
  [2, 'Cartão fidelidade com verniz localizado', 'Cartão de visita', 500, 60, 'producao', 'baixa', 8, 4],
  [3, 'Adesivos de parede motivacionais', 'Adesivo', 12, 9500, 'aprovado', 'alta', 4, 2],
  [3, 'Camisetas evento corrida (silk)', 'Camiseta', 150, 3200, 'orcamento', 'alta', 20, 0],
  [4, 'Etiquetas adesivas para embalagens', 'Etiqueta', 3000, 12, 'entregue', 'media', -10, 25],
  [4, 'Sacolas kraft personalizadas', 'Embalagem', 800, 280, 'producao', 'media', 5, 6],
  [5, 'Receituários timbrados', 'Papelaria', 20, 3500, 'entregue', 'baixa', -20, 40],
  [5, 'Painel de recepção em ACM', 'Comunicação visual', 1, 145000, 'acabamento', 'alta', -1, 12],
  [6, 'Agendas escolares 2027', 'Agenda', 300, 2800, 'aprovado', 'urgente', 10, 3],
  [6, 'Convites formatura infantil', 'Convite', 120, 450, 'pronto', 'media', 1, 9],
  [7, 'Rótulos cerveja IPA — lote 12', 'Rótulo', 4000, 35, 'producao', 'urgente', 3, 4],
  [7, 'Bolachas de chopp personalizadas', 'Impresso promocional', 2000, 40, 'entregue', 'media', -35, 55],
  [0, 'Adesivos para copos descartáveis', 'Adesivo', 1500, 25, 'entregue', 'baixa', -50, 70],
  [1, 'Placas "Vende-se" em PVC', 'Placa', 30, 4500, 'entregue', 'media', -75, 95],
  [2, 'Tabela de preços A4 couché', 'Impresso', 100, 380, 'entregue', 'baixa', -100, 120],
  [3, 'Fachada luminosa — adesivação', 'Comunicação visual', 1, 98000, 'entregue', 'alta', -130, 150],
  [5, 'Envelopes timbrados', 'Papelaria', 1000, 75, 'entregue', 'media', -140, 160],
  [7, 'Banner feira gastronômica', 'Banner', 3, 16000, 'orcamento', 'baixa', 25, 1],
];

const pad = (n) => String(n).padStart(2, '0');
const toSqlDateTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const toSqlDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/** Popula o banco com um usuário demo, clientes e pedidos realistas. */
export async function seedDemo(db) {
  const hash = await bcrypt.hash('demo123', 10);

  transaction(db, () => {
    const { lastInsertRowid: userId } = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
      .run('Usuário Demo', 'demo@printflow.com', hash);

    const insertClient = db.prepare(
      'INSERT INTO clients (name, company, email, phone, document, city) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const clientIds = CLIENTS.map((c) => Number(insertClient.run(...c).lastInsertRowid));

    const insertOrder = db.prepare(
      `INSERT INTO orders (client_id, title, product_type, quantity, unit_price_cents, status, priority,
                           due_date, position, created_by, created_at, updated_at, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const setCode = db.prepare('UPDATE orders SET code = ? WHERE id = ?');
    const history = db.prepare(
      'INSERT INTO order_history (order_id, from_status, to_status, user_id, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const positions = {};

    for (const [ci, title, product, qty, price, status, priority, dueOffset, createdAgo] of ORDERS) {
      const created = toSqlDateTime(addDays(-createdAgo));
      const position = (positions[status] = (positions[status] ?? -1) + 1);
      const { lastInsertRowid } = insertOrder.run(
        clientIds[ci], title, product, qty, price, status, priority, toSqlDate(addDays(dueOffset)),
        position, userId, created, created, `Pedido de ${product.toLowerCase()} para ${CLIENTS[ci][1]}.`
      );
      const id = Number(lastInsertRowid);
      setCode.run(`PF-${String(id).padStart(5, '0')}`, id);
      history.run(id, null, 'orcamento', userId, created);
      if (status !== 'orcamento') history.run(id, 'orcamento', status, userId, created);
    }
  });
}
