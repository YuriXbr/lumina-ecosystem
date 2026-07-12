import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ActiveInput from './ActiveInput';
import { renderWithI18n } from '../../../test/testUtils';

describe('ActiveInput', () => {
  it('renderiza sem crashar', () => { renderWithI18n(<ActiveInput />); });
  it('renderiza input element', () => { renderWithI18n(<ActiveInput />); expect(document.querySelector('input')).not.toBeNull(); });
});
