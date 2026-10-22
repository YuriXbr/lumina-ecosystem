# Auditoria do Lumina Ecosystem

**Data:** 14/10/2026 · **Escopo:** API, dashboard, bot Discord e MongoDB autorizado · **Entrega:** análise e modelagem; código de negócio e banco não foram modificados.

## Parecer executivo

O projeto tem uma base funcional e boa separação entre API, bot e dashboard, mas precisa corrigir falhas de integridade, autenticação e persistência antes de ampliar uso ou monetização. Os riscos mais urgentes são recompensa diária duplicável, resgate repetido de badges, prêmio de baú não persistido, configurações que não são salvas e punições temporárias sem processamento efetivo.

A autenticação já usa cookies httpOnly, bcrypt, verificação de assinatura JWT, CSRF em diversas mutações e controle de acesso em rotas administrativas. Essas proteções são úteis, mas não cobrem uniformemente todos os caminhos. O banco real confirma índices importantes ausentes; comentários que dizem que determinado problema foi corrigido não correspondem sempre ao comportamento atual.

| Área | Avaliação | Motivo principal |
|---|---|---|
| Segurança | Risco alto | Sessões sem revogação, OAuth sem vínculo da transação ao navegador, dependências vulneráveis e checagem de suspensão desigual |
| Usabilidade | Base promissora, com bloqueios funcionais | A interface oferece controles que não persistem ou exigem um cargo global que o administrador comum do servidor não possui |
| Estabilidade | Risco alto em fluxos centrais | Scheduler incompatível com a API, falha silenciosa de prêmio, inicialização de DB irregular e suíte de testes quebrada |
| Dados | Integridade incompleta | Campos flexíveis, vínculos por email, ausência de constraints compostas e exclusão sem tratamento de dependências |

As classificações são julgamentos de engenharia apoiados nas evidências abaixo; não são certificação, pontuação CVSS do sistema ou constatação de invasão.

## Método e limites

- Revisão de código e contratos nos caminhos de autenticação, autorização, inventário, badges, configurações, moderação, infraestrutura e chamadas externas.
- Execução da suíte Jest da API com URI MongoDB local indisponível e dependências de testes simuladas; o alvo de banco dos testes não foi o Atlas. A entrada `index.js` tenta carregar `.env.dev` mesmo em `NODE_ENV=test`, por isso o isolamento de variáveis é relevante.
- Build e lint do dashboard; inspeção visual da home, login e área pública de membros em navegador, com base de API isolada. Login real, OAuth Discord, Riot, ações de moderação e páginas autenticadas não foram exercitados contra serviços reais.
- Inspeção autorizada do MongoDB com driver nativo, sem importar os serviços Mongoose: listagem de coleções/índices, contagens, tipos e agregações de integridade. Nenhum índice ou registro foi criado, alterado ou removido. Os documentos de evidência não contêm valores pessoais, credenciais ou tokens.
- Tipos observados: até 1.000 documentos por coleção. Contagens e algumas agregações usam a coleção inteira, com timeout de 10 segundos. O banco permaneceu em uso; as leituras não constituem snapshot transacional único.
- Auditoria npm de todos os pacotes e separadamente das dependências de produção. Os números representam pacotes assinalados pelo npm, incluindo propagação transitiva; não somam vulnerabilidades únicas nem provam que cada advisory é explorável nesta aplicação.
- Provas de lógica em `reproduzir-achados.cjs`: usam funções reais e respostas controladas, sem rede. Não são testes de invasão no serviço publicado.
- Não foi feita revisão completa do histórico Git, teste de carga, restauração de backup, inspeção das políticas Atlas, avaliação jurídica de privacidade ou teste WCAG completo.

Fontes primárias: a [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html) recomenda ligar a transação OAuth ao navegador e usar proteção de uso único; o [MongoDB](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/) explica o uso de condições no próprio comando atômico; o [Mongoose 8](https://mongoosejs.com/docs/8.x/docs/validation.html) documenta que validadores de updates precisam ser ativados. A [documentação Node.js](https://nodejs.org/api/process.html#warning-using-uncaughtexception-correctly) desaconselha continuar a execução normal após exceção não capturada.

## Resultados executados

| Verificação | Resultado |
|---|---|
| API `npm test -- --json` | 66 suítes: 53 passaram, 13 falharam; 930 testes: 896 passaram, 34 falharam |
| Dashboard `npm run build` | Passou; JS principal 718,18 kB / 194,34 kB gzip; CSS 77,87 kB |
| Dashboard `npm run lint` | Falhou: ESLint 9 sem `eslint.config.js` |
| Dashboard Vitest | Não executável com a instalação declarada: faltam `vitest`, `jsdom` e Testing Library; não há script de testes |
| Bot testes | `npm test` é placeholder que encerra com erro; não há suíte configurada |
| Sintaxe API/bot | 236 arquivos JavaScript em src verificados com `node --check`; zero erros de sintaxe |
| Provas locais de achados | Passaram; confirmaram comportamentos descritos, não correções |
| MongoDB | 19 coleções, metadados e integridade inspecionados em leitura |

As falhas da API incluem mocks inválidos (`mockModel` indefinido), referências a módulo removido, expectativas antigas sobre endpoints e itens permitidos, falhas no refresh Discord e divergências no backoff. Existem timers que tentam importar módulos depois do encerramento do ambiente Jest. Nem todas as 34 falhas representam defeitos de produção; também não devem ser descartadas como ruído sem triagem. A evidência detalhada está em [validacao.json](evidencias/validacao.json).

CSRF e limitadores são desativados em vários caminhos quando `NODE_ENV=test`; a suíte não comprova a cadeia real desses middlewares em produção, ainda que haja testes unitários dedicados.

### Dependências

| Componente | Todas: baixa / moderada / alta / crítica | Produção: moderada / alta / crítica | Total produção |
|---|---|---|---:|
| API | 4 / 7 / 38 / 4 | 4 / 4 / 3 | 11 |
| Dashboard | 1 / 5 / 21 / 0 | 0 / 3 / 0 | 3 |
| Bot | 5 / 14 / 44 / 5 | 4 / 11 / 3 | 18 |

Versões travadas: Mongoose 8.7.3 na API e 8.7.0 no bot; Axios 1.7.7/1.7.4; Vite 5.4.10; React Router DOM 6.27.0. O npm identifica, entre outros, advisories de Mongoose, `form-data` e `proxy-addr`. A vulnerabilidade de geração de boundary de multipart foi publicada pelo próprio [projeto form-data](https://github.com/form-data/form-data/security/advisories/GHSA-fjxv-7rqg-78g4); sua exploração depende de condições específicas. Os links e intervalos completos retornados pelo registry constam no JSON de validação.

Atualizar em branch dedicada, ajustar lockfiles e validar os fluxos. Não executar `npm audit fix --force` indiscriminadamente: algumas sugestões envolvem mudança de major ou downgrade. No dashboard, separar vulnerabilidades do servidor de desenvolvimento/build das bibliotecas entregues ao navegador.

## Achados de segurança e integridade

**Prioridades:** P0 = atender antes de ampliar produção; P1 = próxima etapa de correção; P2 = melhoria planejada. “Confirmado” significa código, metadados ou reprodução controlada; somente quando indicado foi observado em dados existentes.

### S01 — P0 / alta: diária pode ser concedida mais de uma vez

**Evidência:** `lumina-api/src/database/services/UserInventoryService.js`, `claimDaily`; rotas públicas e internas chamam o mesmo serviço. O método lê `nextDailyReward`, decide em memória e grava usando apenas `{userId}`. A prova local executou duas chamadas com a mesma leitura e ambas concederam a recompensa: +6 baús/+2 chaves em vez de +3/+1.

**Impacto:** duplicação de recursos por concorrência. **Correção:** atualizar com filtro de elegibilidade (`nextDailyReward <= now` ou inexistente), `$inc` e atualização do próximo prazo no mesmo comando; tratar criação concorrente e `E11000`. Definir idempotência compartilhada para bot e dashboard. **Aceite:** dezenas de resgates concorrentes concedem exatamente uma diária por janela.

### S02 — P0 / alta: badges repetidas e limite global vulnerável à concorrência

**Evidência:** `src/routes/expapi/v1/badges/redeemBadge.js`, `src/routes/expapi/internal/redeemBadge.js`, `UserBadgeService.js`. A rota web pressupõe índice único e captura `11000`; nem schema nem MongoDB real têm índice `(userEmail,badgeCode)`. A coleção possui apenas `_id_`. O limite faz `count` seguido de `create`.

**Impacto:** uma conta pode resgatar novamente o mesmo código; chamadas simultâneas podem ultrapassar o limite de campanha. A amostra atual possui uma redenção e zero pares duplicados, portanto não há evidência de abuso já ocorrido. **Correção:** índice composto após deduplicação, preferencialmente `(accountId,badgeId)`; reserva de quota e inserção em transação ou contador condicional com compensação durável. **Aceite:** repetição resulta em 409 e quota nunca excede o máximo sob concorrência.

### S03 — P1 / alta: identidade não tem unicidade consistente

**Evidência:** schema `username` único/sparse com default `''`, `usernameLower` com índice não único; confirmado no MongoDB. `setUsername` checa disponibilidade antes de gravar; `authProviders.discord.providerId` também não tem unicidade. Duas contas atuais não possuem username; não foram encontradas duplicatas normalizadas ou de provider.

**Impacto:** nomes diferentes apenas por caixa podem ser reservados simultaneamente; contas OAuth sem username podem colidir na string vazia ao serem criadas; vínculo de provider tem janela de concorrência. **Correção:** índice único parcial em username normalizado não vazio; omitir campo ausente; índice único parcial para provider/ID e tratamento de conflito. **Aceite:** `Alice` e `alice` não coexistem e várias contas sem handle podem ser criadas.

### S04 — P0 / alta: transação OAuth sem vínculo ao navegador e JWT no fragmento

**Evidência:** `oauthProviders/state.js`, `Oauth2/authStart.js`, `Oauth2/authCallback.js`, `exchangeToken.js`. O state assinado contém origin, horário e intent, mas não há challenge de sessão, nonce verificado ou consumo de uso único; o callback de login aceita state válido sem cookie da transação. Não há PKCE nos parâmetros do provider, apesar do README citar PKCE. O callback coloca o JWT no fragmento da URL e o frontend o troca por cookie.

**Impacto:** risco de login CSRF/injeção de resposta OAuth; assinatura evita falsificação de conteúdo, mas não comprova que o navegador iniciou aquela transação. O fragmento não é enviado normalmente ao servidor como query, porém permanece acessível ao JavaScript da página e ao histórico enquanto existir. Não foi executado ataque real contra Discord.

**Correção:** estado aleatório de uso único ligado a cookie de transação ou sessão, expiração e consumo; verificar suporte do provider antes de adotar PKCE. Manter sessão em cookie e usar código efêmero de troca entre origens se necessário. **Aceite:** callback de outro navegador/replay falha; SPA não recebe JWT reutilizável em URL.

### S05 — P1 / alta: suspensão de conta aplicada de forma desigual

**Evidência:** callback checa `banned/blocked` após busca por provider, mas antes do fallback por email; o caminho `intent=link` também não revalida suspensão. Reprodução local encontrou conta suspensa pelo email e recebeu cookie/redirect de sucesso. `dailyReward`, `publicRollskin` e `myInventory` usam JWT + `resolveDiscordAccount`, que não checa suspensão.

**Impacto:** JWT pode ser emitido para conta suspensa nesse caminho; sessões existentes ainda usam rotas que só validam assinatura. Rotas administrativas que chamam `verifyRequestAuthWithAccountCheck` permanecem protegidas pela consulta ao banco; isto não significa bypass universal do painel admin.

**Correção:** middleware comum de autenticação com consulta do estado da conta, aplicado a todos os recursos privados; validar novamente a conta final do callback. Falha de carregamento do service deve negar a operação, não retornar autorização sem conta. **Aceite:** bloquear/banir invalida acesso nos fluxos de senha, OAuth, vínculo, diária, baús e inventário.

### S06 — P1 / alta: logout e troca de senha não revogam JWT

**Evidência:** `authHelpers.verifyRequestAuth`, `logout.js` e `DashboardAccountService.changePassword`. Logout remove cookie; JWT continua válido por até uma hora. Não há `jti`, registro de sessão ou comparação de `lastPasswordChange`/versão de token.

**Impacto:** token previamente obtido pode ser reutilizado após logout ou alteração de senha. **Correção:** sessão revogável identificada por ID, ou versão de sessão/credencial validada no banco; revogar outras sessões ao trocar senha. **Aceite:** token anterior é recusado imediatamente conforme a política escolhida.

### S07 — P0 / alta: dependências vulneráveis e runtime desatualizado

**Evidência:** auditoria npm acima; Dockerfiles `node:20-slim`, bot restringe engine a Node 20. A [tabela oficial Node.js](https://nodejs.org/en/about/previous-releases) registra o fim do suporte da linha 20 em 30/04/2026. Os testes locais usaram Node 24.18.0, diferente do runtime declarado no bot/Docker.

**Impacto:** superfície conhecida de injeção/DoS e patches de plataforma ausentes. Não foi comprovada exploração de cada dependência. **Correção:** runtime LTS suportado compatível, atualização seletiva de pacotes e lockfiles, imagens reprodutíveis e checks de segurança no CI. **Aceite:** nenhuma vulnerabilidade alta/crítica explorável sem tratamento e validação de Discord/voz/OAuth no runtime de produção escolhido.

### S08 — P1 / média: confiança no proxy e limitação podem ser contornadas

**Evidência:** `index.js` confia em um hop (`trust proxy=1`); Compose também expõe a porta 3000. Clientes que alcançam diretamente a API podem fornecer `X-Forwarded-For`. Limitadores de login/registro usam memória; o limitador Mongo faz leitura seguida de incremento e libera a requisição quando há erro.

**Impacto:** troca do IP percebido em topologia com acesso direto; contagem por instância em serverless e ultrapassagem do limite sob paralelismo. **Correção:** API acessível apenas pelo proxy esperado, confiança em proxies/rede explícitos, store compartilhado e incremento/decisão atômicos. Definir comportamento de indisponibilidade para operações sensíveis. **Aceite:** não é possível mudar a identidade de rate limit por header arbitrário nem exceder quota com múltiplas réplicas.

### S09 — P1 / média: validação insuficiente em updates e campos flexíveis

**Evidência:** `DataBaseService.update` não habilita `runValidators`; guilds aceitam objetos/arrays sem validar conteúdo ou limites; admins podem transmitir valores sem validação de domínio completa. `removeInventory` permite saldo negativo e `addInventory` aceita quantidade fracionária positiva. Não há saldos negativos no banco inspecionado.

**Impacto:** configurações incoerentes, economia inválida e falhas tardias. **Correção:** schemas de request, subdocumentos tipados, enums/intervalos, inteiros e saldo condicionado; `runValidators` onde aplicável. `$inc` exige invariantes no filtro/serviço, pois validadores de update não cobrem todos os operadores. **Aceite:** IDs inválidos, saldos negativos, NaN e quantidades fracionárias são recusados.

### S10 — P1 / média: credenciais OAuth persistidas sem proteção de aplicação

**Evidência:** callback grava access/refresh token diretamente em campos string; nenhuma criptografia desses campos aparece no fluxo. Configuração interna do bot usa AES-CBC sem tag de autenticação; chaves internas podem ser transmitidas por query no caminho legado.

**Impacto:** leitura de documentos expõe credenciais utilizáveis; CBC sozinho não autentica ciphertext. A criptografia de armazenamento do Atlas, se configurada, é uma proteção diferente e não foi auditada. **Correção:** segredo cifrado com AEAD e gestão de chave/versionamento, escopos mínimos, remoção de tokens sem uso e API keys somente em header. **Aceite:** dump de coleção não contém tokens reutilizáveis em claro; adulteração de ciphertext é detectada.

### S11 — P1 / média: perfil privado e exclusão têm semântica incompleta

**Evidência:** `publicProfile.js` retorna accountId, Discord ID e fallback de nome/sobrenome mesmo com `publicProfile=false`. O encerramento usa TTL só em `dashboardaccounts`; não há job de limpeza/retenção de badges, inventário, caches e logs. Inventário pertence ao Discord, portanto sua remoção exige regra explícita para o uso pelo bot.

**Impacto:** opção “privado” pode surpreender; fechamento deixa dependências e dados correlacionáveis. **Correção:** contrato explícito de visibilidade, opt-in para nome/Discord e workflow de exclusão/anomização com política por domínio. **Aceite:** testar exposição por tipo de perfil e exclusão ponta a ponta, incluindo cancelamento. Não se conclui conformidade ou infração legal apenas por esta análise.

### S12 — P2 / média: proteção CSRF depende de cobertura manual

**Evidência:** flag por rota no loader; exchange-token é POST sem CSRF e aceita token fornecido no body. Double-submit não é assinado nem vinculado à sessão. Há SameSite=Lax e exigência de header em várias rotas, o que reduz riscos.

**Correção:** política global para mutações autenticadas por cookie, validação de Origin/Fetch Metadata, token ligado à sessão e tratamento específico dos endpoints de login/troca. Validar especialmente a possibilidade de login CSRF quando a API recebe requisição sem Origin. **Aceite:** testes com configuração equivalente à produção verificam POST/PUT/DELETE sem proteção e não assumem que CORS substitui CSRF.

## Achados de estabilidade e contratos

### E01 — P0 / alta: controles de servidor não são persistidos corretamente

**Evidência:** schema `guilds` não declara `commandsEnabled`, `autoMessages`, `blockedUsers`, `blockedRoles`, `gachaEnabled`, `gachaChestsEnabled` ou `memberCount`. A prova com schema Mongoose descarta esses campos. Eles também não apareceram nos sete documentos reais.

O frontend envia `gachaRefreshInterval`, mas o backend aceita `gachaRollsRefreshInterval` em milissegundos; há divergência de nome e unidade. O toggle de moderação envia `moderationChannelId='configured'`, que não é um canal Discord. IDs de usuários/cargos são copiados para `blockedChannels`. Os comandos usam chaves diferentes: frontend `league.profile`, guard `league.leagueprofile`; baús usam `skins.openchest` no frontend e `chests.openchest` no bot.

**Impacto:** resposta de sucesso pode esconder campos descartados; toggles não controlam o bot, intervalos não mudam, canais inválidos e bloqueios atuam no domínio errado. **Correção:** contrato único e versionado; schema explícito; rejeitar campos não suportados; catálogo de comandos compartilhado; conversão de unidade. **Aceite:** salvar, reler do banco e executar no bot produz o mesmo resultado mostrado no dashboard.

### E02 — P0 / alta: baú consumido sem skin e compensação não durável

**Evidência:** `SkinService.addSkinToInventory` captura erro e retorna `null`; `gachaService.rollSkin` ignora o retorno e anuncia o prêmio. Prova local reproduziu sucesso sem persistência. Na exceção, chave e baú são devolvidos separadamente, com erros de reembolso silenciados. Queda entre etapas também deixa operação parcial.

**Correção:** debit+premiação na mesma transação/atualização quando possível; verificar retorno e propagar falha; ID de operação e ledger/reconciliação para interrupções. **Aceite:** injetar falhas em cada etapa gera prêmio e débito únicos, ou nenhum dos dois.

### E03 — P0 / alta: scheduler de punições desconectado do armazenamento real

**Evidência:** API grava `banlists`, `mutelists`, `warnlists`; bot consulta `punishlists`, que não existe no banco inspecionado. Não foi encontrada chamada de `mongoose.connect` no bot; o scheduler retorna enquanto não conectado. Também há require relativo inválido (`../utils/services/LuminaApiService`, dentro de `src/utils/services`) e falta de campo tipo: o processamento tenta remover mute e ban por inferência.

**Impacto:** punições temporárias podem permanecer após o prazo/restart; eventual execução em coleção manualmente preenchida pode revogar a ação errada. **Correção:** uma fonte única de punições com tipo/status explícitos, worker com lease e retries; escolher conexão direta ou API interna consistente. **Aceite:** restart e execução simultânea de dois workers encerram somente a punição correta, exatamente uma vez conforme política.

### E04 — P1 / alta: inicialização irregular do banco e rotas que falham silenciosamente

**Evidência:** `NewsService.listPublished/getById` acessam o model sem `connect`; o serviço genérico conecta sob demanda, mas o boot não aguarda DB. O loader captura erro de import e pula a rota. Índices são criados em timeout de cinco segundos ou sob demanda, com erros silenciados.

**Impacto:** primeira requisição anônima de notícias pode sofrer timeout de buffering se nenhuma operação anterior conectou; rota importante pode desaparecer mantendo o processo aparentemente disponível. Este cenário foi identificado no código, não exercitado com cold start de produção.

**Correção:** bootstrap aguarda configuração/DB, inicializa índices via migração controlada, valida registry de rotas e publica readiness distinta de liveness. **Aceite:** cold start com DB disponível atende notícias imediatamente; DB indisponível resulta em readiness negativa/503; falha em rota obrigatória impede boot saudável.

### E05 — P1 / média: execução continua após exceções não capturadas

**Evidência:** handlers globais da API e bot apenas registram `uncaughtException` e continuam. **Impacto:** processo pode operar em estado parcialmente corrompido. **Correção:** log mínimo, parar novas requisições, encerrar recursos e sair; supervisor reinicia. **Aceite:** falha fatal conduz a shutdown limitado por timeout e reinício observável.

### E06 — P1 / média: logout visual e indisponibilidade se confundem

**Evidência:** `apiFetch.checkSession` converte erro de conexão/resposta em `{authenticated:false}`; `apiLogout` não verifica status HTTP e `UserContext.logout` limpa o usuário. O cookie pode continuar válido após logout rejeitado por CSRF. **Correção:** distinguir sem sessão de erro de serviço; informar logout pendente e repetir operação segura; tratar expiração/renovação do CSRF. **Aceite:** falha de API não redireciona silenciosamente como usuário deslogado; reload não restaura uma sessão anunciada como encerrada.

### E07 — P1 / média: automação de qualidade e build não reprodutíveis

**Evidência:** API lock diverge de `package.json` em `helmet/cross-env`; Docker usa `npm install` para tolerar divergência. Dashboard não tem lint configurado nem dependências de sua suíte. Bot não tem suíte; não há workflow CI versionado encontrado. Script da API passa `NODE_ENV=production` como argumento depois de `index.js`, sem definir variável.

**Correção:** lockfiles alinhados e `npm ci`, scripts corretos, lint/test/build no CI, testes contratuais e cenários reais em staging. **Aceite:** checkout limpo reproduz instalação e checks; produção é selecionada por variável real e não por argumento sem interpretação.

### E08 — P1 / média: Docker local usa produção e cookies exigem HTTPS

**Evidência:** Compose declara uso do mesmo Atlas de produção, publica HTTP 80, API em NODE_ENV=production e cookies Secure. Sem terminador TLS externo, autenticação por cookie falha em acesso HTTP comum; browser pode tratar localhost de forma especial, portanto testar o alvo real. Não há healthcheck, shutdown coordenado ou usuário sem privilégio nos Dockerfiles Node.

**Correção:** staging separado, TLS explícito, healthchecks/readiness, usuário não root e limites de recursos; evitar publicar porta interna da API. **Aceite:** instalação documentada funciona sob a URL anunciada e não escreve em produção durante desenvolvimento.

### E09 — P2 / média: chamadas externas e métricas precisam de consistência

OAuth troca/refresh e resolução de perfil têm chamadas Axios sem timeout em diversos pontos; rotas de guilda já incluem timeouts e tratamento de 429. `metrics.js` mantém contadores em memória, portanto métricas administrativas são por processo e reiniciam; não representam o ecossistema inteiro em múltiplas réplicas/serverless. Logs em Mongo têm TTL de 30 dias e índices úteis, mas precisam de política consistente de redação/retencão; webhooks de erro incluem email/IP/extra separadamente da stack sanitizada.

**Correção:** timeouts/AbortSignal e retry com jitter somente onde seguro, respeito ao Retry-After, circuit breaker, métricas centralizadas e redação uniforme. **Aceite:** indisponibilidade de Riot/Discord tem prazo e mensagem previsíveis; painel identifica intervalo, fonte e reset dos indicadores.

## Usabilidade e design

| ID / prioridade | Avaliação e evidência | Ação sugerida |
|---|---|---|
| U01 / P0 | Administrador Discord vê edição por `guild.canManage`, mas salva via `/admin/guilds/:id`, que exige nível global >=7; configurações gerais requerem >=8, avançadas >=9 | Endpoint próprio para gestor da guilda, verificando permissão Discord no servidor de destino; reservar endpoint global à equipe Lumina |
| U02 / P1 | Login visual em português tem nomes acessíveis `Email address` e `Password`; link de voltar é só ícone sem nome | Traduzir labels, nomear botões/links, exibir labels persistentes e mensagens associadas aos campos |
| U03 / P1 | Layout do login é legível em desktop; em viewport estreito exige rolagem para alcançar Entrar, com grande espaço vertical | Reduzir margens no mobile; testar teclado virtual, autofill, zoom 200%, foco e recuperação de erro |
| U04 / P2 | Home mostra duas estatísticas rotuladas “Comandos”; GitHub aponta à página genérica; “24/7” é texto estático | Corrigir rótulos/destino; substituir disponibilidade estática por status medido ou texto sem promessa operacional |
| U05 / P1 | Configurações de servidor são em português fixo apesar de haver três locales | Internacionalizar páginas novas e padronizar formatos de data/horário/unidades |
| U06 / P1 | Não foi encontrado fluxo funcional de recuperação de senha; 2FA aparece principalmente no schema e em traduções/área antiga | Implementar recuperação, verificação de email e segurança da conta com feedback claro; não apresentar estado de feature inexistente |
| U07 / P2 | Todas as páginas são importadas em `main.jsx`; bundle principal 718 kB | Lazy loading por rota, Suspense, medição real de LCP/INP/CLS em mobile e orçamento de bundle |
| U08 / P1 | Recusar cookies registra preferência local, sem política por categoria/integração; comentário diz conformidade sem validação | Separar cookies essenciais/opcionais e documentar finalidades, revogação e retenção; revisão jurídica específica se necessário |
| U09 / P2 | Há ErrorState/skeletons e retry em notícias; a prévia isolada mostrou “Erro ao carregar novidades” com Tentar novamente | Manter esse padrão e distinguir dados indisponíveis, conta sem Discord, escopo expirado, sem permissão e lista vazia |

Evidências visuais: [login desktop](evidencias/login-desktop.png), [login estreito](evidencias/login-estreito.png). Nenhum problema de layout nas páginas autenticadas foi apresentado como verificado visualmente.

## Features a adicionar, por benefício e dependência

| Prioridade | Feature | Benefício | Dependências / aceite |
|---|---|---|---|
| P0 | Configuração de servidor funcional por gestor Discord | Torna o dashboard utilizável pela comunidade | Resolver E01/U01; salvar/reler e comprovar comportamento no bot |
| P0 | Ledger de economia e operações idempotentes | Evita perdas/duplicações e facilita suporte | S01/S02/E02; trilha por operação com débito, crédito e reconciliação |
| P0 | Worker persistente de punições | Faz mutes/bans temporários sobreviverem a restart | E03; tipo, estado, lease, tentativa e histórico |
| P1 | Recuperação de senha + verificação de email | Reduz usuários presos fora da conta | Token de uso único armazenado por hash, limite de tentativas e resposta sem enumeração |
| P1 | Sessões ativas e “sair de todos os dispositivos” | Recuperação após comprometimento | S06; revogação imediata e identificação de sessões sem fingerprint excessivo |
| P1 | 2FA ou passkeys para staff | Protege controles administrativos | Sessões/reautenticação; MFA exigido no backend, códigos de recuperação protegidos |
| P1 | Wizard de instalação e diagnóstico de permissões | Reduz suporte e configurações inválidas | Mostrar hierarquia do bot, canais/cargos elegíveis e testes de envio em staging |
| P1 | Histórico de configuração com rollback | Permite recuperar mudanças incorretas | Autor, guilda, antes/depois redigidos, versão e invalidação de cache |
| P1 | Painel operacional com status e alertas | Identifica falhas antes dos usuários | Health/readiness, latência, filas, limites Riot/Discord e métricas centralizadas |
| P1 | Exportação de dados e fechamento completo | Dá controle de privacidade ao usuário | S11; política sobre dados do bot, retenção e cancelamento |
| P2 | Histórico de baús, probabilidades e regras transparentes | Melhora confiança e entendimento da coleção | Ledger confiável; distinguir coleção virtual Lumina de propriedade na conta Riot |
| P2 | Perfil com badges/inventário sob opt-in | Completa recursos hoje retornados como placeholders | S11; regras de visibilidade e paginação |
| P2 | Assinatura de novidades/alertas por preferências | Entrega informações úteis sem spam | Consentimento por canal e outbox; deduplicação e limites |
| P2 | Vinculação Riot e histórico de desempenho | Amplia valor para jogadores | Verificar políticas/scopes oficiais Riot antes de integrar; cache, quotas e atribuição de dados |

Trocas entre usuários, ranking competitivo de inventário e monetização devem esperar integridade da economia, regras de abuso e entendimento de propriedade dos itens. Os dados pessoais/endereço/documento governamental atualmente previstos no schema não são necessários por padrão para o bot; avaliar minimização antes de coletá-los.

## Arquitetura recomendada e sequência

Manter a separação atual em três componentes. Para o tamanho observado, não há evidência que justifique microserviços adicionais nem migração imediata para SQL. Centralizar contratos/DTOs, catálogo de comandos, autorização e serviços de economia; MongoDB pode implementar índices, transações e invariantes necessários. O modelo relacional entregue serve para documentação, validação dos vínculos e opção futura de migração.

1. **Integridade e acesso:** S01, S02, S04, S05, E01, E02, E03 e U01; cobertura de concorrência/falha e atualização de dependências/runtime em branch própria.
2. **Estabilização:** bootstrap/readiness, shutdown, pipeline reproduzível, isolamento de staging, índices versionados, revogação de sessões e timeouts.
3. **Experiência e produto:** recuperação/MFA, wizard, auditoria de configuração, privacidade e paginação/lazy loading; depois features de coleção e integração Riot.

Cada etapa deve terminar com aceite mensurável: checkout limpo passa os checks; concorrência não duplica recursos; salvar configuração persiste e muda o comportamento do bot; restart não perde punições; sessão suspensa/revogada é recusada; restauração de backup é exercitada em ambiente separado.

## Engenharia reversa entregue

- [Modelo lógico e relações atuais](MODELOS.md): cardinalidades, identidades, domínios e divergências.
- [Dicionário completo](DICIONARIO-DADOS.md): 17 schemas, 302 campos declarados, 19 coleções reais e índices observados.
- [Modelo relacional proposto em SQL](modelo-relacional.sql): PKs, FKs, UNIQUEs, CHECKs e decomposição dos arrays/objetos de domínio. É uma proposta normalizada; não é o schema já aplicado ao MongoDB.
- [Metadados anônimos do MongoDB](evidencias/mongo-metadata.json), [validação/dependências](evidencias/validacao.json) e [provas locais](evidencias/reproducoes.json).

O banco observado contém cinco contas, sete guildas, nove inventários, um badge/uma redenção, 174 campeões, 1.920 skins de catálogo e 17 bans. Zero usernames normalizados, providers ou pares de badge duplicados foram encontrados; ausência de duplicatas hoje não substitui constraints. Sete inventários sem conta de dashboard podem representar usuários exclusivos do bot. A coleção de logs tinha cerca de 15,1 mil documentos e estava recebendo eventos durante a leitura.

O DDL proposto passou pelo parser PostgreSQL (`pglast`): 49 tabelas e 70 destinos de FKs conferidos, sem execução em PostgreSQL ou no MongoDB. Os dois diagramas Mermaid foram renderizados localmente e exportados em SVG. A versão HTML foi conferida no navegador.
