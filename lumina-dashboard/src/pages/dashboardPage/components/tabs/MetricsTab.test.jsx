import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import MetricsTab from './MetricsTab';
import { renderWithProviders, makeAdminUser } from '../../../../test/testUtils';
const mockFetch = vi.fn();
global.fetch = mockFetch;
beforeEach(() => mockFetch.mockReset());
function renderMetrics(data) {
  mockFetch.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
  return renderWithProviders(<MetricsTab />, { user: makeAdminUser() });
}
describe('MetricsTab', () => {
  it('apresenta memória ausente como indisponível sem NaN', async () => {
    const { container } = renderMetrics({ memory: {}, totalRequests: 20 });
    expect(await screen.findByText('Indisponível')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('NaN');
    expect(screen.getByText('20')).toBeInTheDocument();
  });
  it('mostra valores de memória informados pela API em MB', async () => {
    renderMetrics({ memory: { heapUsed: 10485760, heapTotal: 20971520 } });
    expect(await screen.findByText('10.0 MB')).toBeInTheDocument();
    expect(screen.getByText('de 20.0 MB alocados')).toBeInTheDocument();
  });
  it('apresenta erro com opção de tentar novamente', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 'Indisponível' }), { status: 503 }));
    renderWithProviders(<MetricsTab />, { user: makeAdminUser() });
    expect(await screen.findByText('Erro ao carregar métricas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
