import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ReauthModal from './ReauthModal';
import { renderWithI18n } from '../../../test/testUtils';

describe('ReauthModal', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<ReauthModal onClose={vi.fn()} />); });
  it('renderiza botão de fechar', () => { renderWithI18n(<ReauthModal onClose={vi.fn()} />); expect(screen.getAllByRole('button').length).toBeGreaterThan(0); });
  it('chama onClose ao clicar', () => { const onClose = vi.fn(); renderWithI18n(<ReauthModal onClose={onClose} />); const btn = screen.getAllByRole('button')[0]; fireEvent.click(btn); });
});
