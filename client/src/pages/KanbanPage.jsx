import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, GripVertical } from 'lucide-react';
import { api } from '../lib/api.js';
import { STATUSES } from '../lib/constants.js';
import { dueLabel, daysUntil, formatCurrency } from '../lib/format.js';
import { groupByStatus, moveCard, resolveDropIndex } from '../lib/kanban.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader } from '../components/ui.jsx';
import { PriorityBadge } from '../components/Badges.jsx';
import Spinner from '../components/Spinner.jsx';
import OrderFormModal from '../components/OrderFormModal.jsx';

function KanbanCard({ order, dragging, onDragStart, onDragEnd, onOpen }) {
  const diff = daysUntil(order.due_date);
  const late = diff !== null && diff < 0 && order.status !== 'entregue';
  const soon = diff !== null && diff >= 0 && diff <= 1 && order.status !== 'entregue';

  return (
    <article
      className={`kanban-card priority-edge-${order.priority} ${dragging ? 'is-dragging' : ''}`}
      draggable
      data-card-id={order.id}
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(order.id)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(order.id)}
    >
      <div className="kanban-card-top">
        <span className="code">{order.code}</span>
        <PriorityBadge priority={order.priority} />
        <GripVertical size={14} className="grip" />
      </div>
      <h4>{order.title}</h4>
      <p className="muted small">{order.client_name}</p>
      <div className="kanban-card-meta">
        <span className="small muted">{order.quantity.toLocaleString('pt-BR')} × {order.product_type}</span>
      </div>
      <div className="kanban-card-footer">
        <span className={`due-chip ${late ? 'due-late' : soon ? 'due-soon' : ''}`}>
          <Calendar size={12} /> {order.due_date ? dueLabel(order.due_date) : 'Sem prazo'}
        </span>
        <strong className="small">{formatCurrency(order.total_cents)}</strong>
      </div>
    </article>
  );
}

export default function KanbanPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState(null);
  const [drop, setDrop] = useState(null); // { status, index }
  const [creating, setCreating] = useState(null);

  const load = useCallback(() => {
    api.get('/orders?sort=position').then(setOrders).catch((err) => toast.error(err.message));
  }, [toast]);

  useEffect(load, [load]);

  const term = search.trim().toLowerCase();
  const matches = useCallback(
    (o) => !term || [o.title, o.code, o.client_name, o.product_type].some((v) => v?.toLowerCase().includes(term)),
    [term]
  );
  const groups = useMemo(() => groupByStatus(orders ?? []), [orders]);

  function handleDragStart(e, id) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  }

  function handleDragEnd() {
    setDragId(null);
    setDrop(null);
  }

  function handleDragOver(e, status) {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cards = [...e.currentTarget.querySelectorAll('[data-card-id]')].filter(
      (el) => Number(el.dataset.cardId) !== dragId
    );
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    if (drop?.status !== status || drop?.index !== index) setDrop({ status, index });
  }

  async function handleDrop(e, status) {
    e.preventDefault();
    if (dragId === null || !drop) return handleDragEnd();
    const id = dragId;
    const full = groups[status].filter((o) => o.id !== id);
    const visible = full.filter(matches);
    const position = resolveDropIndex(full, visible, drop.index);
    const previous = orders;
    const moved = orders.find((o) => o.id === id);

    setOrders(moveCard(orders, id, status, position)); // atualização otimista
    handleDragEnd();
    try {
      await api.patch(`/orders/${id}/move`, { status, position });
      if (moved.status !== status) {
        toast.success(`${moved.code} → ${STATUSES.find((s) => s.value === status).label}`);
      }
    } catch (err) {
      setOrders(previous);
      toast.error(err.message);
    }
  }

  if (!orders) return <Spinner />;

  return (
    <div className="kanban-page">
      <PageHeader
        title="Produção"
        description="Arraste os cards entre as colunas para atualizar a etapa de cada pedido."
        actions={
          <>
            <div className="input-icon">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar cards…" />
            </div>
            <button className="btn btn-primary" onClick={() => setCreating('orcamento')}>
              <Plus size={18} /> Novo pedido
            </button>
          </>
        }
      />

      <div className="kanban-board">
        {STATUSES.map((s) => {
          const column = groups[s.value];
          const visible = column.filter(matches);
          const total = column.reduce((sum, o) => sum + o.total_cents, 0);
          const isTarget = drop?.status === s.value;
          let k = 0;
          const items = [];
          visible.forEach((o) => {
            if (o.id === dragId) {
              items.push(<KanbanCard key={o.id} order={o} dragging onDragStart={handleDragStart} onDragEnd={handleDragEnd} onOpen={() => {}} />);
              return;
            }
            if (isTarget && drop.index === k) items.push(<div key="placeholder" className="kanban-placeholder" />);
            items.push(
              <KanbanCard key={o.id} order={o} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                onOpen={(id) => navigate(`/pedidos/${id}`)} />
            );
            k++;
          });
          if (isTarget && drop.index === k) items.push(<div key="placeholder" className="kanban-placeholder" />);

          return (
            <section
              key={s.value}
              className={`kanban-column ${isTarget ? 'is-over' : ''}`}
              style={{ '--col-color': s.color }}
              onDragOver={(e) => handleDragOver(e, s.value)}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDrop(null)}
              onDrop={(e) => handleDrop(e, s.value)}
              aria-label={s.label}
            >
              <header className="kanban-column-header">
                <div>
                  <span className="col-dot" />
                  <h3>{s.label}</h3>
                  <span className="col-count">{column.length}</span>
                </div>
                <button className="icon-btn" title={`Novo pedido em ${s.label}`} onClick={() => setCreating(s.value)}>
                  <Plus size={16} />
                </button>
              </header>
              <div className="kanban-column-total muted small">{formatCurrency(total)}</div>
              <div className="kanban-cards">
                {items}
                {visible.length === 0 && !isTarget && <div className="kanban-empty">Solte um card aqui</div>}
              </div>
            </section>
          );
        })}
      </div>

      {creating && (
        <OrderFormModal defaultStatus={creating} onClose={() => setCreating(null)}
          onSaved={() => { setCreating(null); load(); }} />
      )}
    </div>
  );
}
