import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DangerBadge from './DangerBadge';
import { renderWithI18n } from '../../../test/testUtils';

describe('DangerBadge', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<DangerBadge />); });
  it('renderiza com children', () => { renderWithI18n(<DangerBadge><span>Danger</span></DangerBadge>); expect(screen.getByText('Danger')).toBeInTheDocument(); });
});
