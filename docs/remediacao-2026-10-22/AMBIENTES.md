# Ambientes e variáveis — revisão de 24/10/2026

## Contrato e conferência

O contrato por componente está em `scripts/environment-contract.json`. Execute, na raiz, depois de instalar as dependências da API:

```powershell
node scripts/audit-env.cjs --check
node --test scripts/test/audit-env.test.cjs
```

A auditoria é somente leitura: não importa a aplicação, não conecta ao banco e não mostra valores. Lista chaves desconhecidas, obrigatórias ausentes e referências diretas de código sem classificação. Variáveis interpretadas pelo OpenTelemetry e pelo Node/Vercel são separadas das variáveis de negócio. Referências dinâmicas exigem revisão manual; a lista obrigatória do runtime da API e dos scripts do bot foi conferida nesta etapa. O contrato precisa acompanhar futuras mudanças de código.

O `--check` verifica nomes, presença e reaproveitamento literal de banco, token Discord e segredos entre `.env` e `.env.dev`. Não comprova conectividade, entrega nem permissões do usuário do Atlas. O Compose valida seus próprios campos obrigatórios na inicialização.

## Separação

| Local | Conteúdo | Consumidor |
|---|---|---|
| `.env` na raiz | `LUMINA_DEV_*` | Docker Compose local |
| `lumina-api/.env.dev` | Backend de desenvolvimento | `npm run dev` da API |
| `lumina-api/.env` | Backend de produção local | `npm start` da API e migrador com `NODE_ENV=production` |
| `lumina-bot/.env.dev` | Worker Discord de desenvolvimento | `npm run dev`, sync e deploy em desenvolvimento |
| `lumina-bot/.env` | Worker Discord de produção | Scripts com `NODE_ENV=production` |
| `lumina-dashboard/.env*` | Somente configuração pública `VITE_*` | Vite, com precedência por modo |
| Vercel `lumina-api` | Segredos/configuração exclusivamente do backend | Funções HTTP |
| Vercel `lumina-dashboard` | URL pública da API, application ID Discord, Web Analytics público | Build estático |

API e bot resolvem os arquivos do próprio componente, sem depender do diretório em que o terminal está aberto. A Vercel não carrega os arquivos privados locais. O deploy dos comandos do bot agora respeita o mesmo ambiente do bootstrap, em vez de sempre ler `.env` de produção.

Todas as variáveis `VITE_*` são públicas. Um nome sem esse prefixo não é automaticamente exposto pelo Vite, mas credenciais de backend também não devem ser fornecidas ao processo de build do frontend. O Vite agora carrega apenas o prefixo público para configurar seu proxy. O callback Discord pertence à API; `VITE_DISCORD_REDIRECT_URI` foi retirado do Docker e dos exemplos.

## Limpeza aplicada localmente

- Dashboard `.env`: 43 → 2 variáveis. Retiradas 41 entradas sem consumidor, incluindo MongoDB, Riot, JWT, senha administrativa, segredo Discord e chaves internas.
- API `.env` e `.env.dev`: retiradas 28 entradas de cada arquivo, incluindo MySQL, Data API, conexões Mongo antigas, domínio/sufixo/versão e credenciais administrativas não consumidos.
- Bot `.env` e `.env.dev`: retiradas 8 entradas de cada arquivo. O bot não acessa MongoDB diretamente e não usa o segredo OAuth da aplicação.
- Raiz: removidas as cópias de configuração dos componentes; o Compose usa exclusivamente `LUMINA_DEV_*`.
- Valores das chaves preservadas foram comparados antes/depois. Backup privado anterior à limpeza em `.private/env-backups/2026-10-24T21-58-09-255Z/`, ignorado pelo Git. Esse backup contém segredos e não deve ser compartilhado.
- Não foram removidas as chaves do comando experimental `staff/test`: há referências de runtime reais. Descontinuar o comando exige uma decisão funcional separada.

`MONGO_MAX_CONNECTIONS` e `MONGO_MAX_IDLE_TIME` não controlavam o pool atual: a API define seus limites diretamente no adaptador Mongoose. Alterar variáveis ignoradas produzia uma falsa impressão de configuração.

## Gmail e Vercel

Configuradas na API da Vercel, somente em produção: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `SMTP_USER`, `EMAIL_CODE_SECRET`, `MAIL_TRANSPORT`, `ACCOUNT_PUBLIC_ORIGIN`, `MAIL_FROM_VERIFY`, `MAIL_FROM_NOREPLY` e `MAIL_REPLY_TO`. As credenciais e o HMAC foram armazenados como sensíveis; aliases/origem são públicos. Não foi enviado novo email nesta etapa. Alterações de variáveis só chegam a novas publicações.

A URL pública da API no projeto do dashboard foi conferida: `https://api-bot.luminasink.com/`. As chaves existentes de JWT, OAuth e criptografia da API publicada coincidem com a configuração local de produção; não foram rotacionadas.

O proprietário autenticou a CLI Vercel e a limpeza remota foi concluída: removidas 41 entradas do dashboard (43 → 2) e 27 da API (54 → 27, já contando dez configurações de email recém-adicionadas). A releitura confirmou as chaves remanescentes por projeto. Metadados anteriores e o diário de remoção estão em `.private/vercel-env-review-20261024-191145/` e `.private/vercel-cleanup-results.jsonl`; os dados sensíveis continuam fora do Git. Os previews da API não recebem automaticamente segredos de produção.

## Cuidados de operação

- `ENCRYPTION_KEY` precisa ter exatamente 32 bytes UTF-8 no protocolo atual API/bot. A instrução antiga de gerar 64 caracteres hex estava incorreta. Preservar a chave de instalações existentes; mudar apenas um lado quebra a leitura. A evolução para um envelope autenticado também precisa de migração coordenada.
- `DASHBOARD_PORT` e `API_BASE_URL` ainda são aliases/valores legados consumidos pela API para porta/log; não foram classificados como sem uso. Preferir `PORT` e `IP` em novas configurações.
- `DASHBOARD_HOST` do bot contém apenas hostname; `DASHBOARD_PROTOCOL` contém o protocolo. O link padrão foi corrigido para `https://bot.luminasink.com`.
- Com autorização do proprietário, foi criado `lumina_development` no Atlas atual, com os índices de 26 modelos e um marcador de ambiente, sem copiar dados pessoais. O frontend local aponta para `http://localhost:3000`; a configuração de build de produção permanece separada.
- **Exceção temporária explicitamente solicitada:** “use os mesmos segredos da produção por enquanto”. Os segredos JWT/OAuth, chaves internas, criptografia, HMAC de email e credenciais Discord/Riot foram mantidos iguais aos de produção. O banco e as URLs locais continuam separados. O auditor reporta esse compartilhamento; `--check --allow-shared-secrets` reconhece a exceção, mas nunca aceita uma URI de banco idêntica entre os ambientes. Não foi rotacionado nenhum segredo de produção nem iniciada outra instância do bot com o token compartilhado.
- O login Discord retorna `503 AUTH_PROVIDER_UNAVAILABLE` se a aplicação não estiver configurada, sem emitir nonce/cookie. O callback local é `http://localhost:3000/expapi/oauth2/discord/auth/callback`; ele também precisa estar autorizado no Discord Developer Portal para testar OAuth local.
- **Limite da separação:** o banco novo ainda usa o usuário MongoDB existente no cluster. Um usuário do Atlas restrito a `lumina_development` deve substituir essa credencial antes de compartilhar ambientes de desenvolvimento. Não há conector Atlas disponível para provisionar o usuário nesta sessão.
- `SMTP_USER` continua sendo o usuário autenticado do Gmail mesmo em `gmail_api`; aliases `verify@`/`noreply@` não substituem a credencial central. Confirmar o alias no Gmail antes de prometer entrega com esse remetente.
- OTLP é opcional e precisa de coletor HTTPS aprovado. DNS Cloudflare e Web Analytics não são um destino automático para traces do backend. Nenhum serviço pago foi ativado.

## Validação desta etapa

- API: 74 suítes e 1.023 testes aprovados, incluindo configuração por componente, migração em etapas, localização Cloudflare e persistência em MongoDB isolado.
- Bot: 18 testes aprovados, incluindo os entrypoints de ambiente, sincronização, transporte do console e autorização.
- Auditor de configuração: 4 testes aprovados; sem entradas desconhecidas. `--check --allow-shared-secrets` passou com a exceção temporária solicitada pelo proprietário; o banco permanece separado.
- Dashboard: 518 testes aprovados e novo build aprovado; lint com 0 erros e 133 avisos legados. A política de privacidade passou a descrever o registro aproximado de cadastro e último login.
- Busca das credenciais locais da API/bot no bundle gerado: zero correspondências. Isso não é garantia geral de inexistência de segredos; cobre os valores conhecidos nessa conferência.
- Vercel: dez entradas de email relidas no projeto correto, somente em produção; cinco privadas com tipo sensível. Nenhuma promoção de deployment ou migração de dados foi executada nesta etapa.
