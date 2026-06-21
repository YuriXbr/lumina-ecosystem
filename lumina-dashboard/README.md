# 🌐 Lumina Dashboard

> Interface web moderna e responsiva para gerenciamento do Lumina Bot e visualização de dados de League of Legends.

[![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)](https://github.com/YuriXbr/lumina-dashboard)
[![React](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-5.4.9-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-3.4.14-blue.svg)](https://tailwindcss.com/)

## 🎯 Sobre

O Lumina Dashboard é uma aplicação web moderna construída com **React** e **Vite**, oferecendo uma interface elegante e intuitiva para:

- 🎮 **Visualização de Dados LoL**: Estatísticas, skins, campeões e histórico de partidas
- 👤 **Gerenciamento de Perfil**: Login com Discord OAuth2 e personalização
- 🎨 **Inventário de Skins**: Sistema visual para coleção pessoal
- 📊 **Dashboard Analytics**: Métricas e gráficos de performance
- ⚙️ **Configurações do Bot**: Interface para ajustes e preferências
- 📱 **Design Responsivo**: Funciona perfeitamente em desktop e mobile

## ✨ Principais Recursos

### 🎨 Interface Moderna
- Design clean e intuitivo com **Tailwind CSS**
- Componentes reutilizáveis com **Headless UI**
- Ícones modernos com **Heroicons** e **React Icons**
- Tema escuro/claro (dark mode)

### 🔐 Autenticação Segura
- Login com **Discord OAuth2** usando PKCE
- Proteção **CSRF** integrada
- Gerenciamento seguro de tokens **JWT**
- Persistência de sessão

### 📊 Visualização de Dados
- **Inventário de Skins**: Grid responsivo com filtros avançados
- **Estatísticas LoL**: Gráficos interativos de performance
- **Histórico de Partidas**: Timeline detalhada de jogos
- **Perfil de Jogador**: Dados completos do invocador

### 🎯 Sistema de Filtros
- Filtro por **campeão**, **raridade**, **linha de skin**
- **Busca em tempo real** por nome
- **Ordenação** por preço, raridade, alfabética
- **Paginação** otimizada (20 itens por página)

## 🛠️ Tecnologias

- **React** 18.3.1 - Biblioteca principal para UI
- **Vite** 5.4.9 - Build tool e dev server ultra-rápido
- **Tailwind CSS** 3.4.14 - Framework CSS utilitário
- **React Router DOM** 6.27.0 - Roteamento SPA
- **Headless UI** 2.1.10 - Componentes acessíveis
- **Heroicons** 2.1.5 - Ícones SVG modernos
- **React OAuth2 PKCE** 2.0.7 - Autenticação segura

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ ou superior
- NPM ou Yarn
- Lumina API rodando localmente ou em produção

### 1. Clone e instale

```bash
git clone https://github.com/YuriXbr/lumina-dashboard.git
cd lumina-dashboard
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api

# Discord OAuth2
VITE_DISCORD_CLIENT_ID=seu_discord_client_id
VITE_DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback

# Application
VITE_APP_NAME=Lumina Dashboard
VITE_APP_VERSION=1.0.0
```

### 3. Desenvolvimento

```bash
# Servidor de desenvolvimento
npm run dev

# Servidor exposto na rede local  
npm run devexpose

# Build para produção
npm run build

# Preview da build
npm run preview
```

### 4. Acesse a aplicação

- **Desenvolvimento**: <http://localhost:5173>
- **Rede local**: <http://seu-ip:5173> (com devexpose)

## 📱 Páginas e Funcionalidades

### 🏠 Homepage
- **Hero Section**: Apresentação do Lumina Bot
- **Recursos**: Cards destacando principais funcionalidades
- **Estatísticas**: Números de usuários, servidores e comandos
- **Call-to-Action**: Convite para Discord e instalação

### 🔐 Login/Registro
- **Discord OAuth2**: Login seguro com Discord
- **Validação**: Proteção CSRF e validação de formulários
- **UX Otimizada**: Modais elegantes e feedback visual
- **Persistência**: Manutenção de sessão segura

### 🎮 Comandos
- **Categorização**: Comandos organizados por tipo
- **Exemplos**: Sintaxe e uso de cada comando
- **Busca**: Filtro rápido por nome ou categoria
- **Documentação**: Descrições detalhadas

### 💰 Pricing
- **Planos**: Diferentes níveis de acesso
- **Comparação**: Tabela de recursos por plano
- **CTA**: Botões de ação para upgrade
- **FAQ**: Perguntas frequentes sobre preços

### 🎨 Inventário
- **Grid de Skins**: Visualização em cards responsivos
- **Filtros Avançados**: Por campeão, raridade, linha
- **Busca**: Pesquisa em tempo real
- **Ordenação**: Por preço, raridade, alfabética
- **Paginação**: 20 skins por página
- **Agrupamento**: Skins duplicadas agrupadas com contador

## 🎨 Estrutura do Design

### Sistema de Cores

```css
/* Cores principais */
--primary: #8B5CF6     /* Roxo principal */
--secondary: #06B6D4   /* Azul secundário */
--accent: #F59E0B      /* Amarelo destaque */
--dark: #1F2937        /* Cinza escuro */
--light: #F9FAFB       /* Cinza claro */

/* Estados */
--success: #10B981     /* Verde sucesso */
--warning: #F59E0B     /* Amarelo warning */
--error: #EF4444       /* Vermelho erro */
--info: #3B82F6        /* Azul info */
```

### Componentes Reutilizáveis

- **Button**: Botões com variações de estilo
- **Modal**: Modais responsivos e acessíveis  
- **Card**: Cards para exibição de conteúdo
- **Input**: Campos de entrada padronizados
- **Badge**: Tags e indicadores
- **Loader**: Indicadores de carregamento

## 🗂️ Estrutura do Projeto

```text
lumina-dashboard/
├── public/                    # Arquivos estáticos
│   ├── icons/                # Ícones do Lumina
│   ├── images/               # Imagens e assets
│   └── rarityIcons/          # Ícones de raridade LoL
├── src/
│   ├── components/           # Componentes reutilizáveis
│   │   ├── ui/              # Componentes de UI básicos
│   │   └── layout/          # Componentes de layout
│   ├── pages/               # Páginas da aplicação
│   │   ├── homePage/        # Homepage
│   │   ├── loginPage/       # Login/Autenticação
│   │   ├── registerPage/    # Registro de usuário
│   │   ├── commandsPage/    # Documentação de comandos
│   │   ├── pricingPage/     # Planos e preços
│   │   └── inventoryPage/   # Inventário de skins
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Funções utilitárias
│   ├── services/            # Serviços de API
│   ├── styles/              # Estilos globais
│   └── main.jsx             # Entrada da aplicação
├── tailwind.config.js       # Configuração Tailwind
├── vite.config.js          # Configuração Vite
└── package.json            # Dependências e scripts
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run devexpose        # Servidor exposto na rede local

# Build e Deploy
npm run build            # Build para produção
npm run preview          # Preview da build local

# Qualidade de Código
npm run lint             # Verificação ESLint
npm run lint:fix         # Correção automática ESLint
```

## 🎯 Funcionalidades Avançadas

### Sistema de Filtros Inteligentes

```javascript
// Exemplo de filtros no inventário
const filteredSkins = skins.filter(skin => {
  return (
    (selectedChampion === 'all' || skin.champion === selectedChampion) &&
    (selectedRarity === 'all' || skin.rarity === selectedRarity) &&
    (selectedSkinLine === 'all' || skin.skinLine === selectedSkinLine) &&
    skin.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
});
```

### Paginação Otimizada

```javascript
// Sistema de paginação eficiente
const ITEMS_PER_PAGE = 20;
const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
const endIndex = startIndex + ITEMS_PER_PAGE;
const paginatedSkins = filteredSkins.slice(startIndex, endIndex);
```

### Agrupamento de Duplicatas

```javascript
// Agrupamento de skins duplicadas
const groupedSkins = skins.reduce((acc, skin) => {
  const key = `${skin.champion}-${skin.name}`;
  if (acc[key]) {
    acc[key].count++;
  } else {
    acc[key] = { ...skin, count: 1 };
  }
  return acc;
}, {});
```

## 🔐 Segurança

### Proteções Implementadas

- **CSRF Protection**: Tokens CSRF em todas as requisições
- **XSS Prevention**: Sanitização de dados de entrada
- **OAuth2 PKCE**: Fluxo de autenticação seguro
- **HTTPS**: Redirecionamento automático em produção
- **Input Validation**: Validação rigorosa de formulários

### Headers de Segurança

```javascript
// Headers automáticos nas requisições
const headers = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Authorization': `Bearer ${token}`,
  'X-CSRF-Token': csrfToken
};
```

## 🚀 Deploy e Produção

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel --prod
```

### Configuração Vercel

```json
{
  "name": "lumina-dashboard",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Netlify

```bash
npm run build
# Faça upload da pasta 'dist'
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📱 Responsividade

### Breakpoints Tailwind

```css
/* Configuração responsiva */
sm: '640px',   /* Mobile landscape */
md: '768px',   /* Tablet portrait */
lg: '1024px',  /* Tablet landscape */
xl: '1280px',  /* Desktop */
2xl: '1536px'  /* Large desktop */
```

### Mobile-First Design

```jsx
// Exemplo de design responsivo
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4 
  xl:grid-cols-5
">
  {/* Cards responsivos */}
</div>
```

## 🧪 Testes e Qualidade

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@eslint/js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off'
  }
};
```

### Testes Manuais

- ✅ **Navegação**: Todas as rotas funcionais
- ✅ **Autenticação**: Login/logout funcionando
- ✅ **Responsividade**: Teste em diferentes telas
- ✅ **Performance**: Loading times otimizados
- ✅ **Acessibilidade**: Navegação por teclado

## 🎨 Customização

### Temas Personalizados

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        lumina: {
          50: '#f5f3ff',
          500: '#8b5cf6',
          900: '#4c1d95'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  }
};
```

### Componentes Personalizados

```jsx
// Exemplo de componente customizado
const LuminaButton = ({ variant = 'primary', children, ...props }) => {
  const variants = {
    primary: 'bg-lumina-500 hover:bg-lumina-600',
    secondary: 'bg-gray-500 hover:bg-gray-600'
  };
  
  return (
    <button 
      className={`px-4 py-2 rounded-lg ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o repositório
2. **Clone** sua fork localmente
3. **Crie** uma branch para sua feature
4. **Desenvolva** seguindo os padrões
5. **Teste** suas mudanças
6. **Submit** um Pull Request

### Padrões de Código

- **Components**: PascalCase (ex: `SkinCard.jsx`)
- **Files**: camelCase (ex: `userService.js`)  
- **CSS Classes**: Tailwind utility classes
- **Commits**: Conventional commits

### Convenções de Commit

```bash
feat: adiciona nova funcionalidade
fix: corrige bug existente
docs: atualiza documentação
style: mudanças de formatação
refactor: refatoração de código
test: adiciona ou corrige testes
```

## 📝 Changelog

### v0.0.0 (Em Desenvolvimento)

- 🎨 **UI/UX**: Design moderno e responsivo
- 🔐 **Auth**: Sistema de autenticação completo
- 🎮 **Inventário**: Sistema de skins com filtros
- 📊 **Dashboard**: Páginas de estatísticas
- 🛡️ **Segurança**: Proteções CSRF e XSS
- 📱 **Mobile**: Design mobile-first

## 📄 Licença

Este projeto está licenciado sob a **Licença ISC**. Veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### Onde Buscar Ajuda

- **📋 Issues**: [GitHub Issues](https://github.com/YuriXbr/lumina-dashboard/issues)
- **💬 Discord**: [Servidor da Comunidade](https://discord.gg/lumina)
- **📖 Docs**: [Documentação Completa](https://github.com/YuriXbr/lumina/wiki)

### Problemas Comuns

**P: A aplicação não carrega após npm run dev**
R: Verifique se as variáveis de ambiente estão configuradas corretamente no arquivo `.env`

**P: Erro de CORS ao fazer login**  
R: Certifique-se que a Lumina API está rodando e configurada para aceitar requests do dashboard

**P: Skins não aparecem no inventário**
R: Verifique se o usuário está logado e se a API está retornando dados corretamente

---

**Status**: 🚧 **Em Desenvolvimento Ativo** - Interface moderna sendo construída!

Feito com ❤️ pela comunidade Lumina
