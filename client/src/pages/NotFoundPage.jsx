import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <Logo />
      <h1>404</h1>
      <p className="muted">Esta página saiu da impressora e se perdeu.</p>
      <Link to="/" className="btn btn-primary">Voltar ao início</Link>
    </div>
  );
}
