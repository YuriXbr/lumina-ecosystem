# ──────────────────────────────────────────────────────────────────────────────
# Dockerfile da Lumina API
#
# A API é um app Node.js/Express que roda na porta 3000.
# Precisa de variáveis de ambiente (.env) para JWT, MongoDB, Discord OAuth, etc.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas o package.json e package-lock.json primeiro.
# Isso aproveita o cache do Docker: se os pacotes não mudaram,
# a camada de npm install é reutilizada em builds subsequentes.
COPY package.json package-lock.json* ./

# Instala apenas dependências de produção.
# Usa `npm install` (não `npm ci`) porque o package-lock.json pode estar
# dessincronizado com o package.json (ex: cross-env e helmet foram adicionados
# no package.json mas não no lock). O `npm install` resolve isso automaticamente.
RUN npm install --omit=dev

# Copia o resto do código da API
COPY . .

# Cria um arquivo .env vazio para silenciar o warning do @dotenvx/dotenvx.
# Em Docker, as variáveis vêm do docker-compose.yml, não de um arquivo .env físico.
RUN touch .env

# A API escuta na porta 3000 (definido em index.js: process.env.PORT || 3000)
EXPOSE 3000

# Define o ambiente como produção
ENV NODE_ENV=production

# Comando para iniciar a API
CMD ["node", "index.js"]
