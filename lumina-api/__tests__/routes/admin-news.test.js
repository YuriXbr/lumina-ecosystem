/**
 * __tests__/routes/admin-news.test.js
 *
 * Suite para POST|DELETE /expapi/v1/admin/news
 * POST cria post, DELETE remove (via ?id= ou body.id)
 */

'use strict';

const request = require('supertest');
const {
    JWT_SECRET, makeJwt, bearerAuth, getCsrfTokens, combineAuthAndCsrf,
    makeAdminAccount, makeNewsPost,
    mockLogger, mockDashboardAccountService, mockNewsService,
} = require('../helpers/testUtils');

mockLogger();
mockDashboardAccountService();
mockNewsService();

const DashboardAccountService = require('../../src/database/services/DashboardAccountService');
const NewsService = require('../../src/database/services/NewsService');
const app = require('../../index');

jest.useFakeTimers();

beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
});

afterEach(() => jest.clearAllMocks());

describe('POST /expapi/v1/admin/news (criar)', () => {
    const URL = '/expapi/v1/admin/news';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('201 cria post com sucesso', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        NewsService.createPost.mockResolvedValueOnce(makeNewsPost({ title: 'New Post' }));

        const res = await request(app)
            .post(URL)
            .set(headers())
            .send({ title: 'New Post', body: 'Content here' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('post');
    });

    it('400 MISSING_FIELDS sem title', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(headers())
            .send({ body: 'Content' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('400 MISSING_FIELDS sem body', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app)
            .post(URL)
            .set(headers())
            .send({ title: 'Title' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_FIELDS');
    });

    it('401 sem auth', async () => {
        const res = await request(app).post(URL).set(combineAuthAndCsrf({}, csrf.headers)).send({ title: 'X', body: 'Y' });
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'user' })
        );
        const res = await request(app).post(URL).set(headers()).send({ title: 'X', body: 'Y' });
        expect(res.status).toBe(403);
    });
});

describe('DELETE /expapi/v1/admin/news (remover)', () => {
    const URL = '/expapi/v1/admin/news';
    let csrf;
    beforeEach(async () => { csrf = await getCsrfTokens(app); });

    const headers = () => combineAuthAndCsrf(bearerAuth(makeJwt()), csrf.headers);

    it('200 remove post via query ?id=', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        NewsService.deletePost.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app)
            .delete(`${URL}?id=65a1b2c3d4e5f6a7b8c9d0e1`)
            .set(headers());

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
    });

    it('200 remove post via body.id', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        NewsService.deletePost.mockResolvedValueOnce({ deletedCount: 1 });

        const res = await request(app)
            .delete(URL)
            .set(headers())
            .send({ id: '65a1b2c3d4e5f6a7b8c9d0e1' });

        expect(res.status).toBe(200);
    });

    it('400 MISSING_ID sem id', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());

        const res = await request(app).delete(URL).set(headers()).send();

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('MISSING_ID');
    });

    it('404 POST_NOT_FOUND quando post não existe', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(makeAdminAccount());
        NewsService.deletePost.mockResolvedValueOnce({ deletedCount: 0 });

        const res = await request(app).delete(`${URL}?id=ghost`).set(headers());

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('POST_NOT_FOUND');
    });

    it('401 sem auth', async () => {
        const res = await request(app).delete(`${URL}?id=123`).set(combineAuthAndCsrf({}, csrf.headers));
        expect(res.status).toBe(401);
    });

    it('403 INSUFFICIENT_PERMISSION para user', async () => {
        DashboardAccountService.getDashboardAccountByEmail.mockResolvedValue(
            makeAdminAccount({ accessType: 'user' })
        );
        const res = await request(app).delete(`${URL}?id=123`).set(headers());
        expect(res.status).toBe(403);
    });
});

afterAll(async () => {
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 100));
});
