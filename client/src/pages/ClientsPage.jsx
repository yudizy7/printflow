import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Users, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { api, qs } from '../lib/api.js';
import { formatCurrency, initials } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounce } from '../lib/useDebounce.js';
import { PageHeader } from '../components/ui.jsx';
import EmptyState from '../components/ui.jsx';
import Spinner from '../components/Spinner.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | {} | client
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useDebounce(search, 300);

  const load = useCallback(() => {
    api.get(`/clients${qs({ q })}`).then(setClients).catch((err) => toast.error(err.message));
  }, [q, toast]);

  useEffect(load, [load]);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.delete(`/clients/${deleting.id}`);
      toast.success('Cliente excluído');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gerencie a carteira de clientes da gráfica."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={18} /> Novo cliente
          </button>
        }
      />

      <div className="toolbar card">
        <div className="input-icon grow">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, empresa, e-mail ou documento…" />
        </div>
        {clients && <span className="muted small">{clients.length} cliente(s)</span>}
      </div>

      {!clients ? (
        <Spinner />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={q ? 'Tente outro termo de busca.' : 'Cadastre seu primeiro cliente para criar pedidos.'}
          action={!q && <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={18} /> Novo cliente</button>}
        />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th className="num">Pedidos</th>
                <th className="num">Total</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="client-cell">
                      <div className="avatar avatar-soft">{initials(c.company || c.name)}</div>
                      <div>
                        <div className="cell-title">{c.company || c.name}</div>
                        <div className="muted small">{c.company ? c.name : c.document || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.email && <div className="small icon-text"><Mail size={13} /> {c.email}</div>}
                    {c.phone && <div className="small icon-text muted"><Phone size={13} /> {c.phone}</div>}
                    {!c.email && !c.phone && <span className="muted">—</span>}
                  </td>
                  <td>{c.city ? <span className="small icon-text"><MapPin size={13} /> {c.city}</span> : <span className="muted">—</span>}</td>
                  <td className="num">{c.orders_count}</td>
                  <td className="num">{formatCurrency(c.total_cents)}</td>
                  <td className="actions">
                    <button className="icon-btn" title="Editar" onClick={() => setEditing(c)}><Pencil size={16} /></button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => setDeleting(c)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ClientFormModal
          client={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir cliente"
          message={`Tem certeza que deseja excluir "${deleting.company || deleting.name}"? Esta ação não pode ser desfeita.`}
          loading={busy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
