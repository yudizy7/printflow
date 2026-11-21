import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, KanbanSquare, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import { Field } from '../components/ui.jsx';

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-brand">
        <Logo light />
        <div className="auth-brand-content">
          <h2>A produção da sua gráfica, organizada do orçamento à entrega.</h2>
          <ul className="auth-features">
            <li><KanbanSquare size={20} /> Quadro Kanban com arrastar e soltar</li>
            <li><BarChart3 size={20} /> Dashboard com faturamento e prazos</li>
            <li><Users size={20} /> Cadastro de clientes e histórico de pedidos</li>
          </ul>
        </div>
        <p className="auth-brand-footer">© {new Date().getFullYear()} PrintFlow</p>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = () => {
    setEmail('demo@printflow.com');
    setPassword('demo123');
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre para acompanhar seus pedidos.">
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <Field label="E-mail">
          <div className="input-icon">
            <Mail size={16} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@grafica.com" autoComplete="email" required />
          </div>
        </Field>
        <Field label="Senha">
          <div className="input-icon">
            <Lock size={16} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" required />
          </div>
        </Field>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? 'Entrando…' : <>Entrar <ArrowRight size={18} /></>}
        </button>
        <button type="button" className="demo-hint" onClick={fillDemo}>
          Usar conta demo: <b>demo@printflow.com</b> / <b>demo123</b>
        </button>
      </form>
      <p className="auth-switch">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </AuthLayout>
  );
}
