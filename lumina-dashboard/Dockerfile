# ──────────────────────────────────────────────────────────────────────────────
# Dockerfile do Lumina Dashboard
#
# O dashboard é um app React/Vite que precisa ser "buildado" (compilado para
# HTML/CSS/JS estáticos) e depois servido por um web server (Nginx).
#
# Usa multi-stage build:
#   Stage 1 (builder): instala dependências, roda `vite build`, gera a pasta dist/
#   Stage 2 (nginx): copia apenas o dist/ para uma imagem Nginx leve
#
# Resultado: imagem final muito pequena (~25MB vs ~500MB do node).
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build do React ──────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

# Copia package.json e lock
COPY package.json package-lock.json* ./

# Instala TODAS as dependências (incluindo devDependencies — Vite, Tailwind, etc.)
# Usa `npm install` (não `npm ci`) para tolerar dessincronização do lock file.
RUN npm ci

# Copia o código fonte
COPY . .

# Build do projeto.
# VITE_API_BASE_URL deve apontar para a URL pública da API.
# Em Docker, se ambos rodam no mesmo servidor, a URL é o domínio público
# (ex: https://api.seudominio.com) OU, se estiver testando localmente,
# http://localhost:3000 (porta da API exposta no docker-compose).
#
# IMPORTANTE: Esta variável é "baked in" no build do Vite — ela não pode ser
# mudada em runtime. Se precisar de URLs diferentes para staging/produção,
# faça builds separados ou use um script de entrypoint que substitui a URL
# no JS compilado antes do Nginx iniciar.
ARG VITE_API_BASE_URL=http://localhost:3000/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Argumentos opcionais para o Discord OAuth (usados no frontend)
ARG VITE_DISCORD_CLIENT_ID=""
ENV VITE_DISCORD_CLIENT_ID=${VITE_DISCORD_CLIENT_ID}

RUN npm run build

# ── Stage 2: Nginx para servir os arquivos estáticos ─────────────────────────
FROM nginx:alpine

# Remove a configuração default do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos buildados do Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx escuta na porta 80
EXPOSE 80

# Nginx já roda como daemon por padrão com `nginx -g 'daemon off;'`
CMD ["nginx", "-g", "daemon off;"]
