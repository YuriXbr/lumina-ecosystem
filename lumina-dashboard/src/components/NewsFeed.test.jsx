/**
 * src/components/NewsFeed.test.jsx
 *
 * Testes para src/components/NewsFeed.jsx
 *
 * Cobre:
 *   - Estado de loading mostra skeleton
 *   - Estado de erro mostra mensagem + retry
 *   - Empty state mostra "no news"
 *   - Renderiza posts
 *   - Clicar em um post expande
 *   - Botão de refresh funciona
 *   - Tag badges são renderizadas
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import NewsFeed from './NewsFeed';
import { renderWithI18n, makeNewsPost } from '../test/testUtils';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NewsFeed', () => {
  it('mostra skeleton no estado de loading', () => {
    // Fetch nunca resolve — loading fica true
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithI18n(<NewsFeed />);
    // 4 skeleton cards com classe animate-pulse
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('mostra erro + retry quando fetch falha', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Boom' }, 500));
    renderWithI18n(<NewsFeed />);
    // (en-US: "Failed to load news.")
    await waitFor(() => {
      expect(screen.getByText(/failed to load news/i)).toBeInTheDocument();
    });
    // Botão de retry (en-US: "Try again")
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('mostra empty state quando não há posts', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ posts: [] }));
    renderWithI18n(<NewsFeed />);
    // (en-US: "No news published yet.")
    await waitFor(() => {
      expect(screen.getByText(/no news published yet/i)).toBeInTheDocument();
    });
  });

  it('renderiza posts', async () => {
    const posts = [
      makeNewsPost({ id: 'a1', title: 'First Post', excerpt: 'First excerpt' }),
      makeNewsPost({ id: 'b2', title: 'Second Post', excerpt: 'Second excerpt' }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ posts }));
    renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
      expect(screen.getByText('Second Post')).toBeInTheDocument();
    });
  });

  it('clicar em um post expande e mostra o body', async () => {
    const posts = [
      makeNewsPost({
        id: 'a1',
        title: 'Expandable Post',
        body: 'Long body content here.',
        excerpt: 'Short excerpt',
      }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ posts }));
    renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('Expandable Post')).toBeInTheDocument();
    });
    // Body não está visível antes do clique
    expect(screen.queryByText('Long body content here.')).not.toBeInTheDocument();
    // Clica no article
    const article = screen.getByText('Expandable Post').closest('article');
    fireEvent.click(article);
    // Body agora visível
    expect(screen.getByText('Long body content here.')).toBeInTheDocument();
  });

  it('clicar novamente em um post recolhe', async () => {
    const posts = [
      makeNewsPost({
        id: 'a1',
        title: 'Toggle Post',
        body: 'Body text',
        excerpt: 'Excerpt text',
      }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ posts }));
    renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('Toggle Post')).toBeInTheDocument();
    });
    const article = screen.getByText('Toggle Post').closest('article');
    // Primeiro clique expande
    fireEvent.click(article);
    expect(screen.getByText('Body text')).toBeInTheDocument();
    // Segundo clique recolhe
    fireEvent.click(article);
    expect(screen.queryByText('Body text')).not.toBeInTheDocument();
  });

  it('botão de refresh chama fetch novamente', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ posts: [makeNewsPost({ id: 'a1', title: 'Post A' })] })
    );
    renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('Post A')).toBeInTheDocument();
    });
    // 1 chamada inicial ao fetch
    const initialCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('expapi/v1/news')
    ).length;
    expect(initialCalls).toBe(1);
    // Clica no botão de refresh (title="Refresh")
    const refreshBtn = screen.getByTitle(/refresh/i);
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      const totalCalls = mockFetch.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.includes('expapi/v1/news')
      ).length;
      expect(totalCalls).toBe(2);
    });
  });

  it('tag badges são renderizadas', async () => {
    const posts = [
      makeNewsPost({ id: 'a1', title: 'Tagged Post', tag: 'novidade' }),
      makeNewsPost({ id: 'b2', title: 'Other Post', tag: 'aviso' }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ posts }));
    const { container } = renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('Tagged Post')).toBeInTheDocument();
    });
    // Tag 'novidade' usa bg-purple-100 text-purple-700
    const newsBadge = container.querySelector('.bg-purple-100.text-purple-700');
    expect(newsBadge).toBeInTheDocument();
    // Tag 'aviso' usa bg-red-100 text-red-700
    const alertBadge = container.querySelector('.bg-red-100.text-red-700');
    expect(alertBadge).toBeInTheDocument();
  });

  it('mostra badge de pinned quando post está fixado', async () => {
    const posts = [
      makeNewsPost({ id: 'a1', title: 'Pinned Post', pinned: true }),
    ];
    mockFetch.mockResolvedValue(jsonResponse({ posts }));
    renderWithI18n(<NewsFeed />);
    await waitFor(() => {
      expect(screen.getByText('Pinned Post')).toBeInTheDocument();
    });
    // 📌 emoji aparece no badge de pinned
    expect(screen.getByText(/📌/)).toBeInTheDocument();
  });
});
