# ──────────────────────────────────────────────────────────────────────────────
# Dockerfile do Lumina Bot
#
# O bot é um app Node.js/Discord.js que não expõe portas HTTP — ele se conecta
# ao Discord via WebSocket (Gateway) e à API Lumina via HTTP.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:24-slim

# Dependências de sistema para discord.js (opus, voice, etc.)
# ffmpeg-static já vem no package.json, mas algumas libs nativas precisam de
# ferramentas de build no Alpine/slim.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia package.json e lock
COPY package.json package-lock.json* ./

# Instala dependências
# Instala versões reproduzíveis do lockfile validado.
RUN npm ci --omit=dev

# Copia o código
COPY . .

# Cria um arquivo .env vazio para silenciar o warning do @dotenvx/dotenvx.
# Em Docker, as variáveis de ambiente vêm do docker-compose.yml (section `environment:`),
# não de um arquivo .env físico. O dotenvx imprime um warning se o arquivo não existe,
# mas não é fatal — apenas polui o log. Criar um arquivo vazio silencia o warning.
RUN touch .env .env.dev

# Define o ambiente como produção
ENV NODE_ENV=production

# O bot não expõe portas — ele só faz conexões de saída (Discord Gateway + API)
# CMD pode ser sobrescrito no docker-compose se precisar rodar deploy-commands primeiro
USER node
CMD ["node", "index.js"]
