/**
 * src/withAuth.test.jsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import withAuth, { withPermission, withAdmin } from './withAuth';
import { renderWithProviders, makeUser, makeAdminUser } from './test/testUtils';

describe('withAuth HOC', () => {
  const TestComponent = () => <div data-testid="protected">Protected Content</div>;
  const ProtectedComponent = withAuth(TestComponent);

  it('renderiza spinner quando loading=true', () => {
    renderWithProviders(<ProtectedComponent />, { loading: true });
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('redireciona para /login quando user é null e loading=false', () => {
    renderWithProviders(<ProtectedComponent />, { user: null, loading: false });
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('renderiza o componente quando user está logado', () => {
    renderWithProviders(<ProtectedComponent />, { user: makeUser() });
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});

describe('withPermission HOC', () => {
  const TestComponent = () => <div data-testid="gated">Gated Content</div>;
  const GatedComponent = withPermission(TestComponent, 'console');

  it('redireciona para /login quando user é null', () => {
    renderWithProviders(<GatedComponent />, { user: null, loading: false });
    expect(screen.queryByTestId('gated')).not.toBeInTheDocument();
  });

  it('mostra tela de acesso restrito quando user não tem permissão', () => {
    renderWithProviders(<GatedComponent />, { user: makeUser({ accessType: 'user' }) });
    expect(screen.queryByTestId('gated')).not.toBeInTheDocument();
    expect(screen.getByText(/restrito|restricted/i)).toBeInTheDocument();
  });

  it('renderiza componente quando user tem permissão', () => {
    renderWithProviders(<GatedComponent />, { user: makeAdminUser() });
    expect(screen.getByTestId('gated')).toBeInTheDocument();
  });

  it('renderiza componente para owner (tem "all")', () => {
    renderWithProviders(<GatedComponent />, { user: makeUser({ accessType: 'owner' }) });
    expect(screen.getByTestId('gated')).toBeInTheDocument();
  });

  it('mostra link para /members na tela de acesso restrito', () => {
    renderWithProviders(<GatedComponent />, { user: makeUser({ accessType: 'user' }) });
    const membersLink = screen.getByRole('link', { href: '/members' });
    expect(membersLink).toBeInTheDocument();
  });
});

describe('withAdmin HOC', () => {
  const TestComponent = () => <div data-testid="admin">Admin Content</div>;
  const AdminComponent = withAdmin(TestComponent);

  it('renderiza para admin', () => {
    renderWithProviders(<AdminComponent />, { user: makeAdminUser() });
    expect(screen.getByTestId('admin')).toBeInTheDocument();
  });

  it('bloqueia user comum', () => {
    renderWithProviders(<AdminComponent />, { user: makeUser({ accessType: 'user' }) });
    expect(screen.queryByTestId('admin')).not.toBeInTheDocument();
  });

  it('bloqueia moderator (level 6 < 7)', () => {
    renderWithProviders(<AdminComponent />, { user: makeUser({ accessType: 'moderator' }) });
    expect(screen.queryByTestId('admin')).not.toBeInTheDocument();
  });

  it('permite headadmin (level 8 >= 7)', () => {
    renderWithProviders(<AdminComponent />, { user: makeUser({ accessType: 'headadmin' }) });
    expect(screen.getByTestId('admin')).toBeInTheDocument();
  });
});
