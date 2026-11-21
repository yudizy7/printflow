import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Factory, PackageCheck, AlertTriangle, Wallet, ArrowUpRight, CalendarClock } from 'lucide-react';
import { api } from '../lib/api.js';
import { STATUSES } from '../lib/constants.js';
import { dueLabel, daysUntil, formatCompactCurrency, formatCurrency, monthLabel } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/ui.jsx';
import { StatusBadge } from '../components/Badges.jsx';
import Spinner from '../components/Spinner.jsx';

function StatCard({ icon: Icon, label, value, hint, tone = 'indigo', to }) {
  const body = (
    <>
      <div className={`stat-icon tone-${tone}`}><Icon size={20} /></div>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </>
  );
  return to ? <Link to={to} className="card stat-card is-link">{body}</Link> : <div className="card stat-card">{body}</div>;
}

function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.total_cents), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={d.month} className="bar-col" title={`${formatCurrency(d.total_cents)} • ${d.orders} pedidos`}>
          <span className="bar-value">{d.total_cents ? formatCompactCurrency(d.total_cents) : '—'}</span>
          <div className="bar-track">
            <div className={`bar ${i === data.length - 1 ? 'bar-current' : ''}`}
              style={{ height: `${Math.max((d.total_cents / max) * 100, 2)}%` }} />
          </div>
          <span className="bar-label">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusDistribution({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div>
      <div className="stacked-bar">
        {data.map((d) => {
          const info = STATUSES.find((s) => s.value === d.status);
          return d.count ? (
            <div key={d.status} style={{ width: `${(d.count / total) * 100}%`, background: info.color }}
              title={`${info.label}: ${d.count}`} />
          ) : null;
        })}
      </div>
      <ul className="legend">
        {data.map((d) => {
          const info = STATUSES.find((s) => s.value === d.status);
          return (
            <li key={d.status}>
              <span className="legend-dot" style={{ background: info.color }} />
              <span>{info.label}</span>
              <strong>{d.count}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Spinner />;

  const { summary, byStatus, revenueByMonth, upcoming, topClients, recent } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]} 👋`}
        description="Visão geral da produção e do faturamento da gráfica."
        actions={<Link to="/pedidos?novo=1" className="btn btn-primary">Novo pedido</Link>}
      />

      <div className="stats-grid">
        <StatCard icon={ClipboardList} label="Pedidos ativos" value={summary.active_orders} hint={`${summary.clients} clientes cadastrados`} to="/pedidos" />
        <StatCard icon={Factory} label="Em produção" value={summary.in_production} hint="Produção + acabamento" tone="amber" to="/producao" />
        <StatCard icon={PackageCheck} label="Prontos p/ entrega" value={summary.ready_orders} tone="emerald" to="/producao" />
        <StatCard icon={AlertTriangle} label="Atrasados" value={summary.overdue_orders} hint="Prazo vencido" tone="rose" to="/pedidos?atrasados=1" />
        <StatCard icon={Wallet} label="Faturamento do mês" value={formatCurrency(summary.revenue_month_cents)}
          hint={`${formatCurrency(summary.pipeline_cents)} em orçamentos`} tone="violet" />
      </div>

      <div className="dashboard-grid">
        <section className="card span-2">
          <div className="card-header">
            <h3>Faturamento — últimos 6 meses</h3>
            <span className="muted small">Pedidos aprovados</span>
          </div>
          <RevenueChart data={revenueByMonth} />
        </section>

        <section className="card">
          <div className="card-header"><h3>Pedidos por etapa</h3></div>
          <StatusDistribution data={byStatus} />
        </section>

        <section className="card span-2">
          <div className="card-header">
            <h3><CalendarClock size={18} /> Próximas entregas</h3>
            <Link to="/producao" className="link-sm">Ver quadro <ArrowUpRight size={14} /></Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">Nenhuma entrega pendente. 🎉</p>
          ) : (
            <div className="table-wrap">
              <table className="table table-compact">
                <tbody>
                  {upcoming.map((o) => {
                    const diff = daysUntil(o.due_date);
                    return (
                      <tr key={o.id}>
                        <td><Link to={`/pedidos/${o.id}`} className="code">{o.code}</Link></td>
                        <td>
                          <div className="cell-title">{o.title}</div>
                          <div className="muted small">{o.client_name}</div>
                        </td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className={`due ${diff < 0 ? 'due-late' : diff <= 1 ? 'due-soon' : ''}`}>{dueLabel(o.due_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header"><h3>Top clientes</h3></div>
          <ol className="rank-list">
            {topClients.map((c, i) => (
              <li key={c.id}>
                <span className="rank">{i + 1}</span>
                <div>
                  <strong>{c.company || c.name}</strong>
                  <span className="muted small">{c.orders} pedidos</span>
                </div>
                <span className="rank-value">{formatCurrency(c.total_cents)}</span>
              </li>
            ))}
            {topClients.length === 0 && <p className="muted">Sem dados ainda.</p>}
          </ol>
        </section>

        <section className="card span-3">
          <div className="card-header">
            <h3>Pedidos recentes</h3>
            <Link to="/pedidos" className="link-sm">Ver todos <ArrowUpRight size={14} /></Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Código</th><th>Trabalho</th><th>Cliente</th><th>Status</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/pedidos/${o.id}`} className="code">{o.code}</Link></td>
                    <td>{o.title}</td>
                    <td>{o.client_name}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{formatCurrency(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
