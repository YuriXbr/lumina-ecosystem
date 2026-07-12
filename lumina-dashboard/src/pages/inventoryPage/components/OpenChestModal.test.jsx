import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import OpenChestModal from './OpenChestModal';
import { renderWithI18n } from '../../../test/testUtils';

describe('OpenChestModal', () => {
  it('renderiza sem crashar quando aberto', () => { renderWithI18n(<OpenChestModal isOpen={true} onClose={vi.fn()} />); });
  it('renderiza conteúdo modal', () => { const { container } = renderWithI18n(<OpenChestModal isOpen={true} onClose={vi.fn()} />); expect(container.querySelector('div')).not.toBeNull(); });
});
