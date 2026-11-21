import { useState } from 'react';
import Modal from './Modal.jsx';
import { Field } from './ui.jsx';
import { api, fieldErrors } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = { name: '', company: '', email: '', phone: '', document: '', city: '', notes: '' };

export default function ClientFormModal({ client, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(client?.id);
  const [form, setForm] = useState(() =>
    Object.fromEntries(Object.keys(EMPTY).map((k) => [k, client?.[k] ?? '']))
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const saved = isEdit ? await api.put(`/clients/${client.id}`, form) : await api.post('/clients', form);
      toast.success(isEdit ? 'Cliente atualizado' : 'Cliente cadastrado');
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
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      subtitle="Dados de contato e faturamento"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar cliente'}
          </button>
        </>
      }
    >
      <form id="client-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <Field label="Nome do contato *" error={errors.name} className="span-2">
          <input autoFocus value={form.name} onChange={set('name')} placeholder="Ex.: Mariana Costa" />
        </Field>
        <Field label="Empresa" error={errors.company}>
          <input value={form.company} onChange={set('company')} placeholder="Razão social / fantasia" />
        </Field>
        <Field label="CPF / CNPJ" error={errors.document}>
          <input value={form.document} onChange={set('document')} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" value={form.email} onChange={set('email')} placeholder="contato@empresa.com" />
        </Field>
        <Field label="Telefone / WhatsApp" error={errors.phone}>
          <input value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Cidade" error={errors.city} className="span-2">
          <input value={form.city} onChange={set('city')} placeholder="São Paulo - SP" />
        </Field>
        <Field label="Observações" error={errors.notes} className="span-2">
          <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Preferências, condições de pagamento…" />
        </Field>
      </form>
    </Modal>
  );
}
