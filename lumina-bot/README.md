# 🤖 Lumina Bot

> Bot Discord avançado para League of Legends com recursos de moderação, estatísticas e muito mais!

[![Version](https://img.shields.io/badge/version-1.5.0--beta-orange.svg)](https://github.com/YuriXbr/lumina-ecosystem)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/discord.js-14.15.3-blue.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/node.js-20.9.0-green.svg)](https://nodejs.org/)

## 🎯 Sobre

Lumina é um bot Discord completo e moderno focado em **League of Legends** e **moderação de servidores**. Oferece recursos avançados como consulta de estatísticas, histórico de partidas, rotação de campeões, sistema de inventário de skins e muito mais!

### ✨ Principais Recursos

- 🎮 **League of Legends**: Estatísticas detalhadas, histórico de partidas, perfis de jogadores
- 🏆 **Sistema de Ranking**: Acompanhe sua evolução no jogo
- 🎯 **Rotação de Campeões**: Veja os campeões gratuitos da semana
- 🛡️ **Moderação Avançada**: Comandos de administração para servidores
- 📊 **Dashboard Web**: Interface gráfica para configuração
- 🎨 **Inventário de Skins**: Sistema personalizado de coleção
- 🔔 **Notificações**: Alertas personalizados para chamadas de voz
- 📈 **Gráficos e Estatísticas**: Visualizações detalhadas de performance

## 🛠️ Tecnologias

- **Discord.js** v14.15.3 - Framework principal para Discord
- **Node.js** v20.9.0 - Runtime JavaScript
- **Express.js** - Servidor web para dashboard
- **Mongoose** - ODM para MongoDB
- **Canvas & Chart.js** - Geração de gráficos e imagens
- **Axios** - Cliente HTTP para APIs externas
- **JWT** - Autenticação segura
- **Riot Games API** - Dados de League of Legends

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 20.9.0 ou superior
- MongoDB (local ou Atlas)
- Discord Bot Token
- Riot Games API Key

### 1. Clone e instale

```bash
git clone https://github.com/YuriXbr/lumina-bot.git
cd lumina-bot
npm install
```

### 2. Configure o bot

Renomeie `src/private/config.example.json` para `src/private/config.json` e configure:

```json
{
  "bot": {
    "token": "SEU_BOT_TOKEN_AQUI",
    "clientId": "SEU_CLIENT_ID_AQUI", 
    "prefix": "!",
    "status": "online",
    "activity": {
      "type": "PLAYING",
      "name": "League of Legends | /help"
    },
    "devmode": false
  },
  "staff": {
    "owners": ["SEU_DISCORD_ID"],
    "admins": [],
    "moderators": []
  },
  "guilds": {
    "main": "ID_DO_SERVIDOR_PRINCIPAL",
    "logs": {
      "guild": "ID_DO_SERVIDOR_DE_LOGS", 
      "startChannel": "ID_CANAL_INICIALIZACAO",
      "errorChannel": "ID_CANAL_ERROS",
      "debugChannel": "ID_CANAL_DEBUG"
    },
    "deployGuilds": ["SERVIDOR1", "SERVIDOR2"]
  },
  "riotApi": {
    "apiKey": "SUA_RIOT_API_KEY",
    "region": "americas",
    "server": "br1",
    "baseUrl": "api.riotgames.com"
  },
  "dashBoard": {
    "enabled": true,
    "port": 3000,
    "ip": "0.0.0.0",
    "auth": {
      "username": "admin",
      "password": "senha_segura_aqui"
    }
  }
}
```

### 3. Configure variáveis de ambiente

Crie um arquivo `.env`:

```env
# Discord
DISCORD_BOT_TOKEN=seu_bot_token
DISCORD_CLIENT_ID=seu_client_id

# Database  
MONGODB_URI=mongodb://localhost:27017/lumina-bot

# Riot Games
RIOT_API_KEY=sua_riot_api_key

# Dashboard
DASHBOARD_PORT=3000
```

### 4. Deploy dos comandos

```bash
npm run deploy
```

### 5. Inicie o bot

```bash
# Desenvolvimento
npm start

# Com logs detalhados
npm run start --verbose
```

## 🎮 Comandos Disponíveis

### 🏆 League of Legends

- `/leagueprofile <summoner>` - Perfil completo do invocador
- `/leaguematchhistory <summoner>` - Histórico das últimas partidas  
- `/leaguechampionrotation` - Campeões gratuitos da semana
- `/leaguerank <summoner>` - Ranking atual do jogador
- `/leaguestats <summoner>` - Estatísticas detalhadas

### ℹ️ Utilidades

- `/ping` - Latência do bot
- `/server` - Informações do servidor
- `/user [@usuário]` - Informações do usuário
- `/help` - Lista todos os comandos
- `/about` - Sobre o Lumina Bot

### 🛡️ Moderação (Em desenvolvimento)

- `/kick <@usuário> [motivo]` - Expulsar usuário
- `/ban <@usuário> [motivo]` - Banir usuário  
- `/clear <quantidade>` - Limpar mensagens
- `/mute <@usuário> [tempo]` - Silenciar usuário

## 🌐 Dashboard Web

O Lumina inclui um dashboard web completo para configuração e monitoramento.

### Recursos do Dashboard

- 📊 **Painel de Controle**: Overview completo do bot
- ⚙️ **Configurações**: Ajustar comportamento e preferências
- 📈 **Estatísticas**: Métricas de uso e performance
- 👥 **Gerenciamento**: Usuários, permissões e moderação
- 🎨 **Personalização**: Cores, mensagens e comandos personalizados

### Acessando o Dashboard

1. Certifique-se que `dashBoard.enabled: true` no config
2. Inicie o bot com `npm start`
3. Acesse `http://localhost:3000` (ou sua configuração de porta)
4. Use as credenciais definidas em `dashBoard.auth`

### ⚠️ Considerações de Segurança

- **Redes Públicas**: Evite usar o dashboard em WiFi público
- **Credenciais Fortes**: Use senhas complexas para autenticação
- **HTTPS**: Configure SSL/TLS em produção
- **Firewall**: Restrinja acesso por IP quando possível

## 📊 Sistema de Logs

O Lumina possui sistema avançado de logs para monitoramento:

```json
"logs": {
  "guild": "SERVER_ID", 
  "startChannel": "CANAL_INICIALIZACAO",
  "errorChannel": "CANAL_ERROS", 
  "debugChannel": "CANAL_DEBUG",
  "staffChannel": "CANAL_STAFF",
  "dashboardChannel": "CANAL_DASHBOARD",
  "allChannel": "CANAL_TODOS_LOGS"
}
```

### Tipos de Log

- **Start**: Inicialização e restart do bot
- **Error**: Erros e exceções  
- **Debug**: Informações detalhadas para desenvolvimento
- **Staff**: Ações administrativas
- **Dashboard**: Atividade do painel web

## 🔧 Scripts Disponíveis

```bash
npm start              # Iniciar o bot
npm run deploy         # Deploy dos comandos slash
npm run updateskins    # Atualizar lista de skins
npm test              # Executar testes (em desenvolvimento)
```

## 🗂️ Estrutura do Projeto

```text
lumina-bot/
├── src/
│   ├── commands/         # Comandos slash do Discord
│   │   ├── league/      # Comandos do League of Legends
│   │   ├── moderation/  # Comandos de moderação
│   │   └── utility/     # Comandos utilitários
│   ├── events/          # Event handlers do Discord
│   ├── utils/           # Funções utilitárias
│   ├── api/            # Integrações com APIs externas
│   ├── assets/         # Recursos estáticos
│   └── private/        # Configurações privadas
├── logs/               # Arquivos de log
├── deploy-commands.js  # Script de deploy dos comandos
├── index.js           # Entrada principal
└── package.json       # Dependências e scripts
```

## 🎨 Personalização

### Adicionando Novos Comandos

1. Crie um arquivo em `src/commands/categoria/`
2. Siga a estrutura padrão:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meucomando')
    .setDescription('Descrição do comando'),
  
  async execute(interaction) {
    // Lógica do comando
    await interaction.reply('Resposta!');
  }
};
```

1. Execute `npm run deploy` para registrar

### Configurando Events

Crie handlers em `src/events/`:

```javascript
module.exports = {
  name: 'messageCreate',
  once: false,
  execute(message) {
    // Lógica do event
  }
};
```

## 🧪 Desenvolvimento e Testes

### Modo de Desenvolvimento

Configure `devmode: true` para:

- Deploy apenas em servidores específicos
- Logs mais detalhados  
- Recarregamento automático de comandos

### Estrutura de Testes

```bash
# Executar testes
npm test

# Testar comandos específicos
npm test -- --grep "league"

# Coverage de testes
npm test -- --coverage
```

## 🚀 Deploy e Produção

### Hosting Recomendado

- **VPS**: Ubuntu/Debian com PM2
- **Cloud**: Railway, Heroku, DigitalOcean
- **Contêineres**: Docker com Docker Compose

### Usando PM2

```bash
npm install -g pm2
pm2 start index.js --name "lumina-bot"
pm2 save
pm2 startup
```

### Docker

```dockerfile
FROM node:20.9.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

## 🔒 Segurança e Privacidade

### Recursos de Segurança

- **Rate Limiting**: Proteção contra spam
- **Input Validation**: Validação rigorosa de entrada
- **Permission Checks**: Verificação de permissões Discord
- **Secure Storage**: Tokens e senhas criptografados

### Compliance

O Lumina está em conformidade com:

- **Discord ToS**: Termos de Serviço do Discord
- **Riot ToS**: Termos da Riot Games API
- **GDPR**: Proteção de dados pessoais

## 🤝 Contribuição

Adoramos contribuições! Veja como participar:

### 1. Fork e Clone

```bash
git clone https://github.com/seu-usuario/lumina-bot.git
cd lumina-bot  
git checkout -b feature/nova-funcionalidade
```

### 2. Desenvolvimento

- Siga os padrões de código existentes
- Adicione testes para novas funcionalidades
- Documente mudanças significativas

### 3. Pull Request

- Descreva claramente as mudanças
- Inclua screenshots se aplicável
- Certifique-se que os testes passam

### Diretrizes

- **Commits**: Use mensagens descritivas
- **Code Style**: ESLint + Prettier
- **Documentação**: Mantenha README atualizado
- **Testes**: Cubra novas funcionalidades

## 📝 Changelog

### v1.5.0-beta (Atual)

- 🎨 Dashboard web completamente redesenhado
- 🛡️ Sistema de segurança aprimorado
- 📊 Novos gráficos e visualizações
- 🎮 Integração melhorada com Riot API
- 🔧 Performance e estabilidade otimizadas

### v1.4.x

- 🎯 Comandos de League of Legends
- 📈 Sistema básico de estatísticas
- 🏆 Ranking e perfis de jogador

### v1.3.x

- 🤖 Comandos básicos do Discord
- ⚙️ Sistema de configuração
- 📝 Logging básico

## 📄 Licença

Este projeto está licenciado sob a **Licença ISC**. Veja [LICENSE](LICENSE) para detalhes.

### Termos de Uso

Ao usar o Lumina Bot, você concorda com:

- **Discord Terms of Service**
- **Riot Games Terms of Service**
- **Riot Games API Terms of Service**

## 🆘 Suporte e Comunidade

### Onde Buscar Ajuda

- **📋 Issues**: [GitHub Issues](https://github.com/YuriXbr/lumina-bot/issues)
- **💬 Discord**: [Servidor da Comunidade](https://discord.gg/lumina)
- **📖 Wiki**: [Documentação Completa](https://github.com/YuriXbr/lumina/wiki)
- **📧 Contato**: [E-mail do Desenvolvedor](mailto:contact@lumina.com)

### FAQ

**P: O bot não está respondendo aos comandos**  
R: Verifique se os comandos foram deployados (`npm run deploy`) e se o bot tem as permissões necessárias.

**P: Erro "Invalid API Key" da Riot**  
R: Verifique se sua Riot API Key está válida e não expirou. Gere uma nova em [developer.riotgames.com](https://developer.riotgames.com)

**P: Como adicionar novos comandos?**  
R: Consulte a seção "Personalização" deste README e veja exemplos em `src/commands/`

## 🎉 Agradecimentos

- **Discord.js Team** - Framework excepcional
- **Riot Games** - API fantástica do League of Legends
- **Comunidade Lumina** - Feedback e suporte constantes
- **Contribuidores** - Cada PR e issue é valorizado

---

**Status do Projeto**: 🚧 **Beta Ativo** - Novas funcionalidades sendo desenvolvidas constantemente!

Feito com ❤️ pela comunidade Lumina
