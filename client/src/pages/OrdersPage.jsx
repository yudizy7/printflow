import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ClipboardList, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { PRIORITIES, STATUSES } from '../lib/constants.js';
import { dueLabel, formatCurrency, formatDate, isOverdue } from '../lib/format.js';
import { useDebounce } from '../lib/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import EmptyState, { PageHeader } from '../components/ui.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx';
import Spinner from '../components/Spinner.jsx';
import OrderFormModal from '../components/OrderFormModal.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';

export default function OrdersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [overdue, setOverdue] = useState(params.get('atrasados') === '1');
  const [editing, setEditing] = useState(params.get('novo') === '1' ? {} : null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 300);

  useEffect(() => {
    if (params.has('novo') || params.has('atrasados')) setParams({}, { replace: true });
  }, [params, setParams]);

  const load = useCallback(() => {
    api
      .get(`/orders${qs({ q, status, priority, overdue: overdue ? 'true' : '' })}`)
      .then(setOrders)
      .catch((err) => toast.error(err.message));
  }, [q, status, priority, overdue, toast]);

  useEffect(load, [load]);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/orders/${deleting.id}`);
      toast.success(`Pedido ${deleting.code} excluído`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const hasFilters = q || status || priority || overdue;
  const total = orders?.reduce((s, o) => s + o.total_cents, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Todos os trabalhos da gráfica, do orçamento à entrega."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={18} /> Novo pedido
          </button>
        }
      />

      <div className="toolbar card">
        <div className="input-icon grow">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, título, cliente ou produto…" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filtrar por prioridade">
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button className={`btn btn-chip ${overdue ? 'is-active' : ''}`} onClick={() => setOverdue((v) => !v)}>
          <AlertTriangle size={15} /> Atrasados
        </button>
      </div>

      {!orders ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          description={hasFilters ? 'Ajuste os filtros para ver mais resultados.' : 'Crie o primeiro pedido para começar.'}
          action={!hasFilters && <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={18} /> Novo pedido</button>}
        />
      ) : (
        <div className="card table-wrap">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Código</th>
                <th>Trabalho</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Entrega</th>
                <th className="num">Valor</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/pedidos/${o.id}`)}>
                  <td><Link to={`/pedidos/${o.id}`} className="code" onClick={(e) => e.stopPropagation()}>{o.code}</Link></td>
                  <td>
                    <div className="cell-title">{o.title}</div>
                    <div className="muted small">{o.quantity.toLocaleString('pt-BR')} × {o.product_type}</div>
                  </td>
                  <td>{o.client_name}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><PriorityBadge priority={o.priority} /></td>
                  <td>
                    <div>{formatDate(o.due_date)}</div>
                    {o.due_date && o.status !== 'entregue' && (
                      <div className={`small ${isOverdue(o) ? 'text-danger' : 'muted'}`}>{dueLabel(o.due_date)}</div>
                    )}
                  </td>
                  <td className="num strong">{formatCurrency(o.total_cents)}</td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" title="Editar" onClick={() => setEditing(o)}><Pencil size={16} /></button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(o)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="muted">{orders.length} pedido(s)</td>
                <td className="num strong">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editing && (
        <OrderFormModal
          order={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir pedido"
          message={`Excluir o pedido ${deleting.code} — "${deleting.title}"? O histórico também será removido.`}
          loading={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
