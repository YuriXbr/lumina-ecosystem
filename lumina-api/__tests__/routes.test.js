const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index'); // Substitua pelo caminho correto do seu app
const { checkCredentials } = require('../src/database/db');
const { logApiCall } = require('../src/logger/logger.js');

jest.mock('../src/database/db'); // Mock do checkCredentials
jest.mock('../src/logger/logger.js'); // Mock do logApiCall

describe('POST /expapi/v1/login', () => {
  const loginRoute = '/expapi/v1/login';
  const validEmail = 'validemail@gmail.com';
  const validPassword = 'validpass123';

  beforeAll(() => {
    process.env.DASHBOARD_EMAIL = validEmail;
    process.env.DASHBOARD_PASSWORD = validPassword;
    process.env.JWT_SECRET = 'testsecret';
  });

  it('should return 400 if email or password is missing', async () => {
    const response = await request(app).post(loginRoute).send({ email: validEmail });
    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing email or password.');
  });

  it('should return 401 if credentials are invalid', async () => {
    checkCredentials.mockResolvedValueOnce(null); // Simula credenciais inválidas
    const response = await request(app)
      .post(loginRoute)
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });
    expect(response.status).toBe(401);
    expect(response.text).toBe('Invalid email or password.');
    expect(logApiCall).toHaveBeenCalledWith(
      'API',
      'login',
      { email: 'wrong@example.com', password: 'wrongpassword' },
      expect.stringContaining('Login failed'),
      null,
      false,
      expect.stringContaining('Login failed')
    );
  });

  it('should return a JWT token if credentials are valid', async () => {
    checkCredentials.mockResolvedValueOnce(true); // Simula credenciais válidas
    const response = await request(app)
      .post(loginRoute)
      .send({ email: validEmail, password: validPassword });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe(validEmail);
    expect(logApiCall).toHaveBeenCalledWith(
      'API',
      'login',
      { email: validEmail, password: validPassword },
      expect.stringContaining('Login successful'),
      null,
      false,
      expect.stringContaining('Login successful')
    );
  });
});

afterAll(async () => {
  await new Promise(resolve => setTimeout(() => resolve(), 500)); // avoid jest open handle error
});

