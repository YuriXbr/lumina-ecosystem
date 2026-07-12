import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DefaultSelect from './DefaultSelect';
import { renderWithI18n } from '../../../test/testUtils';

describe('DefaultSelect', () => {
  it('renderiza label e options', () => {
    renderWithI18n(<DefaultSelect label="Test" options={[{value:'a',label:'A'},{value:'b',label:'B'}]} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  it('renderiza select element', () => {
    renderWithI18n(<DefaultSelect label="Test" options={[{value:'a',label:'A'}]} />);
    expect(document.querySelector('select')).toBeInTheDocument();
  });
});
