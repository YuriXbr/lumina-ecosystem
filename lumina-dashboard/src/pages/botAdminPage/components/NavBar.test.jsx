import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NavBar from './NavBar';
import { renderWithProviders } from '../../../test/testUtils';

describe('NavBar (BotAdmin)', () => {
  it('renderiza sem crashar', () => {
    expect(() => renderWithProviders(<NavBar />)).not.toThrow();
  });
});
