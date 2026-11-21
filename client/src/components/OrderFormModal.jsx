import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { Field } from './ui.jsx';
import { api, fieldErrors } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PRIORITIES, PRODUCT_TYPES, STATUSES } from '../lib/constants.js';
import { centsToInput, formatCurrency, parseCurrencyToCents } from '../lib/format.js';

export default function OrderFormModal({ order, defaultStatus = 'orcamento', onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(order?.id);
  const [clients, setClients] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: order?.client_id ?? '',
    title: order?.title ?? '',
    product_type: order?.product_type ?? PRODUCT_TYPES[0],
    quantity: order?.quantity ?? 100,
    unit_price: order ? centsToInput(order.unit_price_cents) : '',
    status: order?.status ?? defaultStatus,
    priority: order?.priority ?? 'media',
    due_date: order?.due_date ?? '',
    description: order?.description ?? '',
  });

  useEffect(() => {
    api.get('/clients').then(setClients).catch((err) => toast.error(err.message));
  }, [toast]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const total = useMemo(
    () => (Number(form.quantity) || 0) * parseCurrencyToCents(form.unit_price),
    [form.quantity, form.unit_price]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const { unit_price, ...rest } = form;
    const payload = { ...rest, unit_price_cents: parseCurrencyToCents(unit_price) };
    try {
      const saved = isEdit ? await api.put(`/orders/${order.id}`, payload) : await api.post('/orders', payload);
      toast.success(isEdit ? 'Pedido atualizado' : `Pedido ${saved.code} criado`);
      onSaved(saved);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Editar pedido ${order.code}` : 'Novo pedido'}
      subtitle="Informações do trabalho e da produção"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <div className="modal-total">
            <span className="muted">Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="order-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar pedido'}
          </button>
        </>
      }
    >
      <form id="order-form" className="form-grid form-grid-3" onSubmit={handleSubmit} noValidate>
        <Field label="Título do trabalho *" error={errors.title} className="span-2">
          <input autoFocus value={form.title} onChange={set('title')} placeholder="Ex.: Cartões de visita — equipe" />
        </Field>
        <Field label="Cliente *" error={errors.client_id}>
          <select value={form.client_id} onChange={set('client_id')}>
            <option value="">Selecione…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produto *" error={errors.product_type}>
          <select value={form.product_type} onChange={set('product_type')}>
            {PRODUCT_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Quantidade *" error={errors.quantity}>
          <input type="number" min="1" value={form.quantity} onChange={set('quantity')} />
        </Field>
        <Field label="Preço unitário (R$) *" error={errors.unit_price_cents}>
          <input inputMode="decimal" value={form.unit_price} onChange={set('unit_price')} placeholder="0,00" />
        </Field>
        <Field label="Status" error={errors.status}>
          <select value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Prioridade" error={errors.priority}>
          <select value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Prazo de entrega" error={errors.due_date}>
          <input type="date" value={form.due_date} onChange={set('due_date')} />
        </Field>
        <Field label="Especificações" error={errors.description} className="span-3"
          hint="Papel, gramatura, cores, acabamento, arquivos…">
          <textarea rows={4} value={form.description} onChange={set('description')}
            placeholder="Ex.: Couché 300g, 4x4 cores, laminação fosca + verniz localizado" />
        </Field>
      </form>
    </Modal>
  );
}
