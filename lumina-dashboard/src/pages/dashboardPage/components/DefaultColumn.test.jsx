import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import DefaultColumn from './DefaultColumn';
import { renderWithI18n } from '../../../test/testUtils';

describe('DefaultColumn', () => {
  it('renderiza children', () => { renderWithI18n(<DefaultColumn><div data-testid="child">Content</div></DefaultColumn>); expect(screen.getByTestId('child')).toBeInTheDocument(); });
  it('renderiza sem children', () => { expect(() => renderWithI18n(<DefaultColumn />)).not.toThrow(); });
});
