import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DailyRewardModal from './DailyRewardModal';
import { renderWithI18n } from '../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'tok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('DailyRewardModal (shared)', () => {
  it('renderiza sem crashar quando aberto', () => { renderWithI18n(<DailyRewardModal isOpen={true} onClose={vi.fn()} />); });
  it('renderiza conteúdo', () => { const { container } = renderWithI18n(<DailyRewardModal isOpen={true} onClose={vi.fn()} />); expect(container.querySelector('div')).not.toBeNull(); });
});
