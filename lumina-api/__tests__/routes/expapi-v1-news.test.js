/**
 * __tests__/routes/expapi-v1-news.test.js
 *
 * Suite para GET /expapi/v1/news
 * ROTA PÚBLICA — não exige auth.
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeNewsPost,
    mockLogger, mockNewsService,
} = require('../helpers/testUtils');

mockLogger();
mockNewsService();

const NewsService = require('../../src/database/services/NewsService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('GET /expapi/v1/news', () => {
    const URL = '/expapi/v1/news';

    it('200 retorna posts publicados', async () => {
        const posts = [makeNewsPost(), makeNewsPost({ _id: '65a1b2c3d4e5f6a7b8c9d0e2', title: 'Second News' })];
        NewsService.listPublished.mockResolvedValueOnce(posts);

        const res = await request(app).get(URL);

        expect(res.status).toBe(200);
        expect(res.body.posts).toHaveLength(2);
        expect(res.body.posts[0]).toHaveProperty('id');
        expect(res.body.posts[0]).toHaveProperty('title');
        expect(res.body.posts[0]).toHaveProperty('body');
        expect(res.body.pagination).toEqual({ limit: 20, offset: 0, count: 2 });
    });

    it('200 retorna lista vazia quando não há posts', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        const res = await request(app).get(URL);

        expect(res.status).toBe(200);
        expect(res.body.posts).toEqual([]);
        expect(res.body.pagination.count).toBe(0);
    });

    it('200 aceita query ?limit=10&offset=5', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        const res = await request(app).get(`${URL}?limit=10&offset=5`);

        expect(res.status).toBe(200);
        expect(NewsService.listPublished).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });

    it('200 limita limit a 100 máximo', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?limit=500`);

        expect(NewsService.listPublished).toHaveBeenCalledWith({ limit: 100, offset: 0 });
    });

    it('200 usa limit=20 quando limit=0 (falsy fallback)', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?limit=0`);

        // parseInt('0') = 0, 0 || 20 = 20 (falsy fallback)
        expect(NewsService.listPublished).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it('200 offset nunca é negativo', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?offset=-50`);

        expect(NewsService.listPublished).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it('200 usa defaults quando limit/offset são strings não-numéricas', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);

        await request(app).get(`${URL}?limit=abc&offset=xyz`);

        expect(NewsService.listPublished).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it('500 erro do service', async () => {
        NewsService.listPublished.mockRejectedValueOnce(new Error('DB down'));

        const res = await request(app).get(URL);
        expect(res.status).toBe(500);
    });

    it('funciona sem auth (público)', async () => {
        NewsService.listPublished.mockResolvedValueOnce([]);
        const res = await request(app).get(URL);
        expect(res.status).toBe(200);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
