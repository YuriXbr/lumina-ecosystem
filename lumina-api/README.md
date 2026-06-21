# 🚀 Lumina API

> Sistema de API REST para o Lumina Bot - Fornecendo dados de League of Legends, gerenciamento de usuários e integração com Discord.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/YuriXbr/lumina-api)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-20.9.0-green.svg)](https://nodejs.org/)

## 📋 Sobre

A Lumina API é o backend principal do ecossistema Lumina, fornecendo endpoints seguros para:

- **Dados de League of Legends**: Skins, campeões, match history e estatísticas
- **Sistema de Autenticação**: Login/registro com Discord OAuth2 e JWT
- **Gerenciamento de Inventário**: Sistema de skins pessoais dos usuários
- **Integração Discord**: Sincronização com dados de servidores e usuários
- **Sistema de Logs**: Monitoramento e auditoria de ações

## 🛠️ Tecnologias

- **Runtime**: Node.js 20.9.0
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Autenticação**: JWT + Discord OAuth2
- **Segurança**: CSRF protection, rate limiting, helmet
- **Testes**: Jest + Supertest
- **Deploy**: Vercel

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 20.9.0 ou superior
- MongoDB (local ou Atlas)
- Discord Bot Token e Client ID

### 1. Clone o repositório

```bash
git clone https://github.com/YuriXbr/lumina-api.git
cd lumina-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` baseado no exemplo:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lumina
MONGODB_URI_PROD=mongodb+srv://...

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Discord
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Riot Games
RIOT_API_KEY=your-riot-api-key

# API Configuration
PORT=3001
NODE_ENV=development
INTERNAL_API_KEY=your-internal-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Execute o servidor

```bash
# Desenvolvimento
npm start

# Produção
npm run deploy
```

## 📡 Endpoints da API

### 🔐 Autenticação

```http
POST /auth/login          # Login com Discord
POST /auth/register       # Registro de usuário
POST /auth/refresh        # Refresh JWT token
GET  /auth/me            # Dados do usuário atual
```

### 🎮 League of Legends

```http
GET  /api/lol/skins                    # Lista todas as skins
GET  /api/lol/champions               # Lista todos os campeões
GET  /api/lol/match-history/:puuid    # Histórico de partidas
GET  /api/lol/summoner/:name          # Dados do invocador
```

### 👤 Usuários

```http
GET  /api/users/:id/inventory         # Inventário de skins do usuário
PUT  /api/users/:id/inventory         # Atualizar inventário
GET  /api/users/:id/profile          # Perfil do usuário
```

### 🔒 Rotas Internas (Requer chave especial)

```http
GET  /internal/fetchUserSkins/:userId # Buscar skins do usuário
POST /internal/updateUserData         # Atualizar dados do usuário
```

## 🛡️ Segurança

### Recursos de Segurança Implementados

- **CSRF Protection**: Tokens CSRF para formulários
- **Rate Limiting**: Limitação de requisições por IP
- **JWT Authentication**: Tokens seguros com expiração
- **Input Sanitization**: Sanitização de dados de entrada
- **HTTP Security Headers**:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy`

### Headers de Segurança

```javascript
// Configuração automática de headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## 🗂️ Estrutura do Projeto

```text
lumina-api/
├── src/
│   ├── database/          # Modelos e conexão MongoDB
│   ├── routes/           # Definições de rotas
│   │   ├── auth/         # Autenticação
│   │   ├── api/          # APIs públicas
│   │   └── internal/     # APIs internas
│   ├── logger/           # Sistema de logs
│   ├── private/          # Configurações privadas
│   └── ThirdParty/       # Integrações externas
├── scripts/              # Scripts utilitários
├── __tests__/           # Testes automatizados
├── index.js             # Entrada principal
└── package.json         # Dependências e scripts
```

## 🧪 Testes

Execute os testes automatizados:

```bash
# Executar todos os testes
npm test

# Executar testes específicos
npm test -- --grep "inventory"

# Executar com coverage
npm test -- --coverage
```

### Tipos de Teste

- **Unit Tests**: Funções individuais
- **Integration Tests**: Rotas da API
- **Security Tests**: Validação de segurança

## 📊 Scripts Disponíveis

```bash
npm start              # Iniciar servidor
npm run deploy         # Deploy para produção (Vercel)
npm run update-skins   # Atualizar lista de skins do LoL
npm test              # Executar testes
```

## 🔄 Integração com Riot Games API

A API integra com a Riot Games API para fornecer dados atualizados de League of Legends:

```javascript
// Exemplo de uso da Riot API
const getRiotData = async (summonerName, region = 'br1') => {
  const response = await fetch(
    `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`,
    {
      headers: {
        'X-Riot-Token': process.env.RIOT_API_KEY
      }
    }
  );
  return response.json();
};
```

## 🚀 Deploy

### Vercel (Recomendado)

```bash
npm run deploy
```

### Docker

```dockerfile
FROM node:20.9.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use ESLint para formatação
- Escreva testes para novas funcionalidades
- Mantenha a documentação atualizada
- Siga as convenções de naming

## 📝 Changelog

### v2.0.0

- ✨ Novo sistema de autenticação com Discord OAuth2
- 🛡️ Implementação de CSRF protection
- 🔒 Headers de segurança HTTP
- 📊 Sistema de logs melhorado
- 🎮 Integração completa com Riot Games API

### v1.x.x

- 🎯 Funcionalidades básicas da API
- 📱 Endpoints de usuários e inventário
- 🗄️ Integração com MongoDB

## 📄 Licença

Este projeto está licenciado sob a Licença ISC - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/YuriXbr/lumina-api/issues)
- **Discord**: [Servidor do Lumina](https://discord.gg/lumina)
- **Documentação**: [Wiki do Projeto](https://github.com/YuriXbr/lumina/wiki)

---

Feito com ❤️ pela comunidade Lumina