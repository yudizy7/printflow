import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthLayout } from './LoginPage.jsx';
import { Field } from '../components/ui.jsx';
import { fieldErrors } from '../lib/api.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Crie sua conta" subtitle="Comece a organizar a produção em minutos.">
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <Field label="Nome" error={errors.name}>
          <input value={form.name} onChange={set('name')} placeholder="Seu nome" autoComplete="name" />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" value={form.email} onChange={set('email')} placeholder="voce@grafica.com" autoComplete="email" />
        </Field>
        <Field label="Senha" error={errors.password} hint="Mínimo de 6 caracteres">
          <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? 'Criando conta…' : <>Criar conta <ArrowRight size={18} /></>}
        </button>
      </form>
      <p className="auth-switch">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
