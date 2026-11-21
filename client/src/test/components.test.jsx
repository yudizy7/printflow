import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import { StatusBadge, PriorityBadge } from '../components/Badges.jsx';

function renderLogin() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Badges', () => {
  it('exibe o rótulo do status e da prioridade', () => {
    render(<><StatusBadge status="producao" /><PriorityBadge priority="urgente" /></>);
    expect(screen.getByText('Em produção')).toBeInTheDocument();
    expect(screen.getByText('Urgente')).toHaveClass('priority-urgente');
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preenche credenciais demo ao clicar no atalho', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /usar conta demo/i }));
    expect(screen.getByPlaceholderText('voce@grafica.com')).toHaveValue('demo@printflow.com');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('demo123');
  });

  it('mostra erro retornado pela API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'E-mail ou senha inválidos' }), { status: 401 })
    );
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('voce@grafica.com'), 'x@y.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos');
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('salva o token após login bem-sucedido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'abc', user: { id: 1, name: 'Ana', role: 'admin' } }), { status: 200 })
    );
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText('voce@grafica.com'), 'ana@printflow.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await vi.waitFor(() => expect(localStorage.getItem('printflow:token')).toBe('abc'));
  });
});
