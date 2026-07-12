/**
 * src/pages/dashboardPage/components/SetPasswordModal.test.jsx
 *
 * Testes para src/pages/dashboardPage/components/SetPasswordModal.jsx
 *
 * Cobre:
 *   - Renderiza formulário com inputs de senha + confirmação
 *   - Valida comprimento de senha < 8
 *   - Valida complexidade da senha
 *   - Valida que as senhas coincidem
 *   - Submit chama /expapi/v1/user/set-password
 *   - Botão Skip chama onSkip
 *   - Estado de loading desabilita inputs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SetPasswordModal from './SetPasswordModal';
import { renderWithI18n } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SetPasswordModal', () => {
  // Passamos loading: true para o UserProvider não chamar /session
  // (caso contrário, o mockFetch seria consumido pelo /session antes do SetPasswordModal)

  it('renderiza formulário com inputs de senha e confirmação', () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(2);
  });

  it('renderiza botão de submit', () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    expect(document.querySelector('button[type="submit"]')).toBeInTheDocument();
  });

  it('valida senha com comprimento < 8', async () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'Short1' } });
    fireEvent.change(inputs[1], { target: { value: 'Short1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    // (en-US: "Password must be between 8 and 128 characters.")
    expect(await screen.findByText(/between 8 and 128/i)).toBeInTheDocument();
    // Fetch não foi chamado (validação falhou antes)
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('valida complexidade da senha (sem uppercase)', async () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    // 13 chars, tem dígito e lowercase, mas sem uppercase
    fireEvent.change(inputs[0], { target: { value: 'alllowercase1' } });
    fireEvent.change(inputs[1], { target: { value: 'alllowercase1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    // (en-US: "Password must contain uppercase, lowercase, and number.")
    expect(await screen.findByText(/uppercase, lowercase, and number/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('valida complexidade da senha (sem dígito)', async () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'NoDigitsHere' } });
    fireEvent.change(inputs[1], { target: { value: 'NoDigitsHere' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    expect(await screen.findByText(/uppercase, lowercase, and number/i)).toBeInTheDocument();
  });

  it('valida que as senhas coincidem', async () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'DifferentPass1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    // (en-US: "Passwords don't match.")
    expect(await screen.findByText(/don't match/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submit chama /expapi/v1/user/set-password', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await waitFor(() => {
      const setPasswordCall = mockFetch.mock.calls.find(
        ([url]) => typeof url === 'string' && url.includes('expapi/v1/user/set-password')
      );
      expect(setPasswordCall).toBeDefined();
    });
    // Verifica que o body enviado contém a senha
    const setPasswordCall = mockFetch.mock.calls.find(
      ([url]) => typeof url === 'string' && url.includes('expapi/v1/user/set-password')
    );
    const opts = setPasswordCall[1];
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('ValidPass1');
    expect(opts.headers['X-CSRF-Token']).toBe('csrf-tok');
  });

  it('busca CSRF token antes de chamar set-password', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await waitFor(() => {
      const csrfCall = mockFetch.mock.calls.find(
        ([url]) => typeof url === 'string' && url.includes('expapi/v1/csrf-token')
      );
      expect(csrfCall).toBeDefined();
    });
  });

  it('submit com sucesso chama onSuccess', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const onSuccess = vi.fn();
    renderWithI18n(<SetPasswordModal onSuccess={onSuccess} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('erro do servidor mostra mensagem', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }))
      .mockResolvedValueOnce(
        jsonResponse({ error: 'Senha muito comum.' }, 400)
      );
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await waitFor(() => {
      expect(screen.getByText(/Senha muito comum/i)).toBeInTheDocument();
    });
  });

  it('botão Skip chama onSkip', () => {
    const onSkip = vi.fn();
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={onSkip} />, {
      loading: true,
    });
    // (en-US: "Not now")
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('estado de loading desabilita inputs', async () => {
    // Fetch nunca resolve — loading fica true
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    // Antes do submit, inputs estão habilitados
    expect(inputs[0]).not.toBeDisabled();
    fireEvent.click(document.querySelector('button[type="submit"]'));
    // Após o submit, inputs são desabilitados durante o loading
    await waitFor(() => {
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).toBeDisabled();
    });
  });

  it('estado de loading desabilita botão de submit', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { value: 'ValidPass1' } });
    fireEvent.change(inputs[1], { target: { value: 'ValidPass1' } });
    const submitBtn = document.querySelector('button[type="submit"]');
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });
  });

  it('maxLength dos inputs é 128', () => {
    renderWithI18n(<SetPasswordModal onSuccess={vi.fn()} onSkip={vi.fn()} />, {
      loading: true,
    });
    const inputs = document.querySelectorAll('input[type="password"]');
    expect(inputs[0].maxLength).toBe(128);
    expect(inputs[1].maxLength).toBe(128);
  });
});
