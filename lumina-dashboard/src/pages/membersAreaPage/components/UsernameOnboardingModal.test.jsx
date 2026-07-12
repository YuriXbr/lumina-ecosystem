import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import UsernameOnboardingModal from './UsernameOnboardingModal';
import { renderWithI18n, makeUser } from '../../../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => { mockFetch.mockResolvedValue(new Response(JSON.stringify({ available: true, reason: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })); });

describe('UsernameOnboardingModal', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<UsernameOnboardingModal user={makeUser()} onClose={vi.fn()} />); });
  it('renderiza input de username', () => { renderWithI18n(<UsernameOnboardingModal user={makeUser()} onClose={vi.fn()} />); expect(document.querySelector('input')).not.toBeNull(); });
});
