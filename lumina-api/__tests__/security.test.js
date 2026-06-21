// Teste de Segurança - Verificação das Correções Aplicadas
const request = require('supertest');
const app = require('../index');

describe('Testes de Segurança - Correções Aplicadas', () => {
  
  describe('Teste do Backdoor Removido', () => {
    it('Não deve permitir login com credenciais de ambiente', async () => {
      const response = await request(app)
        .post('/expapi/v1/login')
        .send({
          email: process.env.DASHBOARD_EMAIL || 'admin@test.com',
          password: process.env.DASHBOARD_PASSWORD || 'admin123'
        });
      
      // Deve falhar se não existir no banco de dados
      expect(response.status).toBe(401);
    });
  });

  describe('Teste de Rate Limiting', () => {
    it('Deve bloquear após 5 tentativas de login', async () => {
      const loginData = { email: 'test@test.com', password: 'wrongpass' };
      
      // Fazer 5 tentativas
      for (let i = 0; i < 5; i++) {
        await request(app).post('/expapi/v1/login').send(loginData);
      }
      
      // A 6ª tentativa deve ser bloqueada
      const response = await request(app).post('/expapi/v1/login').send(loginData);
      expect(response.status).toBe(429); // Too Many Requests
    });

    it('Deve bloquear registro após 3 tentativas', async () => {
      const registerData = {
        email: 'test@test.com',
        password: 'Test123456',
        firstName: 'Test',
        lastName: 'User'
      };
      
      // Fazer 3 tentativas
      for (let i = 0; i < 3; i++) {
        await request(app).post('/expapi/v1/register').send(registerData);
      }
      
      // A 4ª tentativa deve ser bloqueada
      const response = await request(app).post('/expapi/v1/register').send(registerData);
      expect(response.status).toBe(429);
    });
  });

  describe('Teste de Validação JWT', () => {
    it('Deve rejeitar header malformado', async () => {
      const response = await request(app)
        .post('/expapi/v1/validate-token')
        .set('Authorization', 'InvalidFormat')
        .send();
      
      expect(response.status).toBe(401);
      expect(response.text).toContain('Invalid authorization header format');
    });

    it('Deve rejeitar requisições sem header Authorization', async () => {
      const response = await request(app)
        .post('/expapi/v1/validate-token')
        .send();
      
      expect(response.status).toBe(401);
    });
  });

  describe('Teste de Validação de Senha', () => {
    it('Deve rejeitar senhas fracas', async () => {
      const weakPasswords = [
        'short',
        '12345678',
        'onlylowercase',
        'ONLYUPPERCASE',
        'NoNumbers'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/expapi/v1/register')
          .send({
            email: 'test@test.com',
            password,
            firstName: 'Test',
            lastName: 'User'
          });
        
        expect(response.status).toBe(400);
      }
    });

    it('Deve aceitar senhas fortes', async () => {
      const response = await request(app)
        .post('/expapi/v1/register')
        .send({
          email: 'test@test.com',
          password: 'StrongPass123',
          firstName: 'Test',
          lastName: 'User'
        });
      
      // Pode falhar por outros motivos (email já existe), mas não por senha fraca
      expect(response.status).not.toBe(400);
    });
  });

  describe('Teste de Headers de Segurança', () => {
    it('Deve incluir headers de segurança', async () => {
      const response = await request(app).get('/');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Teste de CORS', () => {
    it('Deve rejeitar origens não autorizadas', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'https://malicious-site.com')
        .send();
      
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('Deve aceitar origens autorizadas', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'https://luminasink.me')
        .send();
      
      expect(response.headers['access-control-allow-origin']).toBe('https://luminasink.me');
    });
  });
});
