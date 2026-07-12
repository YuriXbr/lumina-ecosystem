/**
 * src/utils/membersApi.test.js
 *
 * Testes para src/utils/membersApi.js
 *
 * Cobre:
 *   - fetchMyGuilds: GET /expapi/v1/my-guilds, lança em erro
 *   - fetchNews: GET /expapi/v1/news com paginação
 *   - createNewsPost: POST /expapi/v1/admin/news com CSRF
 *   - deleteNewsPost: DELETE /expapi/v1/admin/news?id= com CSRF
 *   - getDiscordAvatarUrl: monta URL do CDN
 *   - getDiscordBannerUrl: monta URL do CDN
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  fetchMyGuilds,
  fetchNews,
  createNewsPost,
  deleteNewsPost,
  getDiscordAvatarUrl,
  getDiscordBannerUrl,
  _resetCsrfCacheForTests,
} from '../utils/membersApi';

beforeEach(() => {
  mockFetch.mockReset();
  _resetCsrfCacheForTests();
});

afterEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── fetchMyGuilds ─────────────────────────────────────────────────────────
describe('fetchMyGuilds', () => {
  it('retorna guildas em sucesso', async () => {
    const guilds = [{ id: '1', name: 'Server A', hasBot: true }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ guilds }));

    const result = await fetchMyGuilds();

    expect(result.guilds).toEqual(guilds);
    expect(mockFetch.mock.calls[0][1].credentials).toBe('include');
  });

  it('lança Error com mensagem do body em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Discord não vinculado' }, 400));

    await expect(fetchMyGuilds()).rejects.toThrow('Discord não vinculado');
  });

  it('lança Error com HTTP status quando body não tem error', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ unrelated: true }, 500));

    await expect(fetchMyGuilds()).rejects.toThrow('HTTP 500');
  });

  it('lança Error quando fetch falha (não-JSON)', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Server error', { status: 500 }));

    await expect(fetchMyGuilds()).rejects.toThrow();
  });
});

// ─── fetchNews ─────────────────────────────────────────────────────────────
describe('fetchNews', () => {
  it('retorna posts com paginação default', async () => {
    const data = { posts: [{ id: '1', title: 'News 1' }], pagination: { limit: 20, offset: 0, count: 1 } };
    mockFetch.mockResolvedValueOnce(jsonResponse(data));

    const result = await fetchNews();

    expect(result.posts).toHaveLength(1);
    // URL deve ter limit=20 e offset=0
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('limit=20');
    expect(calledUrl).toContain('offset=0');
  });

  it('aceita limit e offset customizados', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ posts: [], pagination: {} }));

    await fetchNews({ limit: 10, offset: 30 });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('offset=30');
  });

  it('lança Error em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Forbidden' }, 403));

    await expect(fetchNews()).rejects.toThrow('Forbidden');
  });
});

// ─── createNewsPost ────────────────────────────────────────────────────────
describe('createNewsPost', () => {
  beforeEach(() => {
    // Mock getCsrfToken (interno do membersApi)
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }));
  });

  it('faz POST com body JSON e CSRF token', async () => {
    const post = { id: '1', title: 'New Post' };
    mockFetch.mockResolvedValueOnce(jsonResponse({ post }));

    const result = await createNewsPost({
      title: 'New Post',
      body: 'Content',
      excerpt: 'Ex',
      imageUrl: 'https://example.com/img.png',
      tag: 'novidade',
      pinned: false,
    });

    expect(result.post.title).toBe('New Post');
    const createCall = mockFetch.mock.calls[1];
    expect(createCall[1].method).toBe('POST');
    expect(createCall[1].headers['X-CSRF-Token']).toBe('csrf-tok');
    expect(createCall[1].headers['Content-Type']).toBe('application/json');
    const sentBody = JSON.parse(createCall[1].body);
    expect(sentBody.title).toBe('New Post');
  });

  it('lança Error em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Missing fields' }, 400));

    await expect(createNewsPost({ title: 'X', body: 'Y' })).rejects.toThrow('Missing fields');
  });
});

// ─── deleteNewsPost ────────────────────────────────────────────────────────
describe('deleteNewsPost', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-tok' }));
  });

  it('faz DELETE com id na query e CSRF token', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await deleteNewsPost('65a1b2c3d4e5f6a7b8c9d0e1');

    const deleteCall = mockFetch.mock.calls[1];
    expect(deleteCall[1].method).toBe('DELETE');
    expect(deleteCall[0]).toContain('id=65a1b2c3d4e5f6a7b8c9d0e1');
    expect(deleteCall[1].headers['X-CSRF-Token']).toBe('csrf-tok');
  });

  it('encoda id na URL (encodeURIComponent)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await deleteNewsPost('id with spaces');

    const deleteCall = mockFetch.mock.calls[1];
    expect(deleteCall[0]).toContain('id=id%20with%20spaces');
  });

  it('lança Error em resposta não-OK', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Post not found' }, 404));

    await expect(deleteNewsPost('ghost-id')).rejects.toThrow('Post not found');
  });
});

// ─── getDiscordAvatarUrl ───────────────────────────────────────────────────
describe('getDiscordAvatarUrl', () => {
  it('monta URL com id e avatar', () => {
    const url = getDiscordAvatarUrl({ id: '123456', avatar: 'abc123' });
    expect(url).toBe('https://cdn.discordapp.com/avatars/123456/abc123.png?size=256');
  });

  it('usa discordOauth2Id quando id não está presente', () => {
    const url = getDiscordAvatarUrl({ discordOauth2Id: '789', avatar: 'xyz' });
    expect(url).toBe('https://cdn.discordapp.com/avatars/789/xyz.png?size=256');
  });

  it('usa discordAvatar quando avatar não está presente', () => {
    const url = getDiscordAvatarUrl({ id: '123', discordAvatar: 'def' });
    expect(url).toBe('https://cdn.discordapp.com/avatars/123/def.png?size=256');
  });

  it('retorna null quando user é null', () => {
    expect(getDiscordAvatarUrl(null)).toBeNull();
  });

  it('retorna null quando id está ausente', () => {
    expect(getDiscordAvatarUrl({ avatar: 'abc' })).toBeNull();
  });

  it('retorna null quando avatar está ausente', () => {
    expect(getDiscordAvatarUrl({ id: '123' })).toBeNull();
  });
});

// ─── getDiscordBannerUrl ───────────────────────────────────────────────────
describe('getDiscordBannerUrl', () => {
  it('monta URL com id e discordBanner', () => {
    const url = getDiscordBannerUrl({ id: '123', discordBanner: 'banner-hash' });
    expect(url).toBe('https://cdn.discordapp.com/banners/123/banner-hash.png?size=1024');
  });

  it('usa discordOauth2Id quando id não está presente', () => {
    const url = getDiscordBannerUrl({ discordOauth2Id: '456', discordBanner: 'b' });
    expect(url).toBe('https://cdn.discordapp.com/banners/456/b.png?size=1024');
  });

  it('retorna null quando user é null', () => {
    expect(getDiscordBannerUrl(null)).toBeNull();
  });

  it('retorna null quando discordBanner está ausente', () => {
    expect(getDiscordBannerUrl({ id: '123' })).toBeNull();
  });
});
