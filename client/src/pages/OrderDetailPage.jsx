import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, User, Calendar, Package, History, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { STATUSES, statusInfo } from '../lib/constants.js';
import { dueLabel, formatCurrency, formatDate, formatDateTime, isOverdue } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import Spinner from '../components/Spinner.jsx';
import OrderFormModal from '../components/OrderFormModal.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/orders/${id}`).then(setOrder).catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  async function advance(status) {
    try {
      await api.patch(`/orders/${order.id}/move`, { status, position: 9999 });
      toast.success(`Pedido movido para "${statusInfo(status).label}"`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/orders/${order.id}`);
      toast.success('Pedido excluído');
      navigate('/pedidos');
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
        <Link to="/pedidos" className="btn btn-ghost"><ArrowLeft size={16} /> Voltar para pedidos</Link>
      </div>
    );
  }
  if (!order) return <Spinner />;

  const currentIndex = STATUSES.findIndex((s) => s.value === order.status);
  const next = STATUSES[currentIndex + 1];

  return (
    <>
      <Link to="/pedidos" className="back-link"><ArrowLeft size={16} /> Pedidos</Link>

      <div className="page-header">
        <div>
          <div className="detail-code">
            <span className="code">{order.code}</span>
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
          <h1>{order.title}</h1>
          <p className="muted">Criado em {formatDateTime(order.created_at)}{order.created_by_name && ` por ${order.created_by_name}`}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} /> Editar</button>
          <button className="btn btn-ghost danger" onClick={() => setDeleting(true)}><Trash2 size={16} /> Excluir</button>
          {next && (
            <button className="btn btn-primary" onClick={() => advance(next.value)}>
              Mover para {next.label} <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="card stepper">
        {STATUSES.map((s, i) => (
          <button key={s.value} type="button"
            className={`step ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
            onClick={() => s.value !== order.status && advance(s.value)} title={`Mover para ${s.label}`}>
            <span className="step-dot" style={{ '--step-color': s.color }}>{i + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="card-header"><h3><Package size={18} /> Detalhes do trabalho</h3></div>
          <dl className="info-list">
            <div><dt>Produto</dt><dd>{order.product_type}</dd></div>
            <div><dt>Quantidade</dt><dd>{order.quantity.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Preço unitário</dt><dd>{formatCurrency(order.unit_price_cents)}</dd></div>
            <div><dt>Total</dt><dd className="total-value">{formatCurrency(order.total_cents)}</dd></div>
          </dl>
          <h4 className="section-label">Especificações</h4>
          <p className="description">{order.description || <span className="muted">Sem especificações.</span>}</p>
        </section>

        <div className="detail-side">
          <section className="card">
            <div className="card-header"><h3><User size={18} /> Cliente</h3></div>
            <strong>{order.client_name}</strong>
            {order.client_company && <p className="muted">{order.client_company}</p>}
          </section>
          <section className="card">
            <div className="card-header"><h3><Calendar size={18} /> Prazo</h3></div>
            <strong>{formatDate(order.due_date)}</strong>
            {order.due_date && order.status !== 'entregue' && (
              <p className={isOverdue(order) ? 'text-danger' : 'muted'}>{dueLabel(order.due_date)}</p>
            )}
          </section>
          <section className="card">
            <div className="card-header"><h3><History size={18} /> Histórico</h3></div>
            <ol className="timeline">
              {order.history.map((h) => (
                <li key={h.id}>
                  <span className="timeline-dot" style={{ background: statusInfo(h.to_status).color }} />
                  <div>
                    <strong>
                      {h.from_status
                        ? `${statusInfo(h.from_status).label} → ${statusInfo(h.to_status).label}`
                        : `Criado como ${statusInfo(h.to_status).label}`}
                    </strong>
                    <span className="muted small">{formatDateTime(h.created_at)}{h.user_name && ` • ${h.user_name}`}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {editing && (
        <OrderFormModal order={order} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }} />
      )}
      {deleting && (
        <ConfirmDialog title="Excluir pedido" message={`Excluir o pedido ${order.code}? Esta ação não pode ser desfeita.`}
          loading={busy} onConfirm={confirmDelete} onClose={() => setDeleting(false)} />
      )}
    </>
  );
}
