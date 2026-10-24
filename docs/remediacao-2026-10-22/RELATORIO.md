# Relatório de remediação — Lumina Ecosystem

Atualizado em 24/10/2026. Responsável público: **LuminaInk**. Base local: main `cbfa458`; implementação na branch `codex/security-design-observability`.

**Estado: implementação e revisão em andamento; não liberado para produção.** As alterações descritas são do código local. Nenhuma publicação de produção, migração aplicada ao Atlas ou contratação foi feita. A verificação manual do login Discord em produção utilizou o fluxo normal de autenticação autorizado pelo proprietário; pode atualizar tokens e registros de acesso da própria conta. O teste real de email foi expressamente autorizado e está documentado separadamente.

## Entregas e evidências

| Área | Alteração no código | Evidência e limite |
|---|---|---|
| Integridade de recompensas | Diária condicional atômica; débito e prêmio do baú no mesmo documento; resgate de badge com quota e transação. | MongoDB replica set temporário: concorrência de 40 operações e falhas controladas. Não houve distribuição de recursos a usuários reais. |
| Autenticação | Sessões de uma hora, versão de credenciais, revogação persistida, estado atual de suspensão consultado no banco; JWT fora das respostas de login. | Suíte completa da API aprovada, incluindo sessão, troca de senha, revogação e compatibilidade de sessões legadas. |
| OAuth | Nonce assinado ligado ao navegador, consumo único, código de troca de 60 s ligado à origem/cookie; tokens criptografados com AES-GCM no banco. | Testes isolados de uso único, origem, replay e vínculo. A migração de tokens de produção não foi aplicada. |
| Email | Verificação e recuperação por oito caracteres alfanuméricos, 15 min, cinco tentativas, uso único e bloqueio compartilhado de 24 h mediante confirmação. Gmail API com renovação OAuth. | Transações isoladas e envio de uma demonstração de `devenv@` para `devteam@`, recebida no Gmail com o remetente preservado. Aliases de produção e ambiente Vercel ainda precisam de validação. |
| Configuração de servidores | Validação por gestor Discord, tipos/canais/cargos, chaves de comandos e unidades alinhadas ao bot. Reconciliação no início e a cada cinco minutos. | Testes de autorização e preservação das configurações. Nenhuma modificação de servidor real nesta iteração. |
| Console | Logs persistidos, ingestão autenticada, leitura incremental por HTTPS, pausa/background, status do bot real e diagnósticos somente leitura com lease. | Integração com MongoDB isolado, testes do transporte e inspeção visual de desktop e mobile com dados simulados. [Detalhes](DISCORD-CONSOLE.md). |
| Estabilidade | Conexão Mongo compartilhada e limitada; timeouts HTTP; readiness/liveness; falha de inicialização explícita; encerramento após erros fatais; processamento recuperável de punições e exclusões agendadas. | Testes de concorrência e serviços. Não foram executadas punições ou exclusões reais. |
| Frontend | Shell, header/footer, tokens, formulários, feedback e modais compartilhados; inventário integrado; páginas carregadas sob demanda. | Build aprovado, testes de componentes e inspeções em navegador. A matriz visual abaixo identifica a cobertura parcial. |
| Políticas | Termos, privacidade e cookies/dados locais com LuminaInk, contatos corretos e links no footer global, configurações, cadastro e emails. | Rotas públicas e links inspecionados; isso não equivale a certificação jurídica de conformidade. |
| Telemetria | Cloudflare Web Analytics no dashboard, correlação request ID/CF-Ray/traceparent e OpenTelemetry opcional na API. | Código e identificação pública configurados. Nenhum coletor de traces de backend foi contratado ou presumido. [Configuração](CLOUDFLARE.md). |
| Desenvolvimento | Node 24, lockfiles atualizados, arquivos privados excluídos de Git e imagens Docker; Compose exige credenciais/banco de desenvolvimento e bot opt-in. | `docker compose config --quiet` aprovado com valores fictícios. Containers não foram iniciados contra o banco de produção. |

## Regressões relatadas em 24/10

O convite de instalação usava parâmetros do login e podia retornar a um callback incorreto. Todos os convites passaram a usar um gerador sem callback. O login por senha omitia os escopos do Discord e acionava um pedido automático de reautenticação; agora há DTO único e reconexão explícita quando necessária. Servidores adicionados durante uma queda passaram a ser recuperados pela reconciliação automática.

Na revisão visual, a página Sobre perdeu o footer duplicado e seus selos passaram a quebrar linha no celular. Falhas de sessão na área de membros agora mostram nova tentativa, sem aparentar logout; foi removida uma consulta duplicada de novidades. A revisão administrativa corrigiu a paginação que reaplicava um recorte local sobre resultados já paginados da API, os campos antigos do editor de guildas e a remontagem dos modais durante digitação. Botões de ícone têm área de toque consistente e os títulos contextuais compartilham a mesma hierarquia. A presença inativa do bot agora também aparece corretamente na lista administrativa.

Planos pagos sem checkout foram identificados como propostas indisponíveis, com preços a definir, enquanto a preferência do proprietário não chega.

Também foi corrigido o uso de ID ausente em sessões legadas na desvinculação do Discord, e o callback de vínculo passou a conferir revogação/versão atual da sessão antes de alterar a identidade vinculada.

## Validação

- **Frontend completo:** 79 arquivos, **518 testes aprovados**, zero falhas na rodada final de 24/10. Inclui conta sem Discord, sessão indisponível, memória ausente, footer único em Sobre, login/cadastro e disponibilidade dos planos. Testes de markup redundantes foram substituídos por verificações de comportamento.
- **Build do dashboard:** aprovado; bundle principal aproximadamente 420 kB, gzip 136 kB. Na comparação anterior, o JavaScript inicial passou de 740.637 para 431.861 bytes (gzip 195.631 para 140.283), com dependências equivalentes. Isso não comprova melhoria de latência, LCP ou INP em produção.
- **Lint:** zero erros e 133 avisos de código legado na última execução. Os avisos não são apresentados como revisão concluída de todos os componentes.
- **Bot:** 13 testes aprovados para autorização de comandos, mensagens automáticas, punições, reconciliação e transporte do console.
- **API completa:** **70 suítes e 1.002 testes aprovados**, zero falhas. A triagem das 144 falhas iniciais incluiu correções de sessão/vínculo, resposta de permissão administrativa, CSRF real, nonce/cookie OAuth e testes atualizados para as gravações atômicas de inventário e badges. As proteções do runtime não foram relaxadas para atender aos contratos antigos.
- **SQL complementar:** sintaxe PostgreSQL aprovada com `pglast 8.7`; proposta documental, sem execução ou criação de banco. A validação não equivale a uma migração de dados testada.
- Resumo reproduzível em [validacao.json](validacao.json).
- Nenhum teste de escrita utilizou o Atlas de produção. Não foram executados comandos de moderação em membros reais.

## Cobertura visual

| Página/estado | Evidência disponível | Limite |
|---|---|---|
| Privacidade e cookies | Desktop e 390×844; leitura, links e ausência de overflow global. | Textos e layout locais. |
| Configurações | Perfil e links legais ao final; retorno a termos com scroll no início. | Dados simulados. |
| Membros | Desktop e 390×844; servidores presentes/ausentes/sem permissão, vazio e conta sem Discord. | Dados simulados. Login real e abertura da configuração do servidor Lumina Bot também conferidos na versão publicada anterior. |
| Inventário | Mobile preenchido/vazio, recursos, filtros e seletor de baús; shell compartilhado com membros. | Dados simulados; a inspeção não cobre toda combinação de coleção/erro/idioma. |
| Administração | Paginação de usuários/guildas com dados preenchidos; registros legados sem nome; modais mobile, foco, Escape, labels e payload canônico. | Dados simulados. Modificações de contas/servidores reais não foram executadas. |
| Console | Desktop e 390×844; eventos, métricas do processo, pausa e navegação administrativa. | Dados simulados; não comprova ingestão do novo transporte em produção. |
| Páginas públicas | Comandos em desktop/mobile, Sobre corrigido em mobile, planos em desktop/mobile e 404 em desktop. | VIP/Enterprise ficam em planejamento; preços aguardam preferência do proprietário. Não existe contratação integrada. |
| Login, cadastro e recuperação | Login/cadastro mobile; solicitação de código, cooldown de reenvio e confirmação de recusa por 24h com footer legal. | Recuperação e recusa usam API simulada, sem modificar senha ou bloquear conta real. |
| Email | Demonstração entregue e aberta no Gmail, com links legais e From correto. | Um destinatário controlado; não testa todos os provedores/clientes de email. |

Não é correto afirmar que todas as páginas e todos os estados já foram revisados visualmente. Faltam concluir a matriz completa de visitante/membro/admin, desktop/mobile, vazio/erro/carregando e integrações autenticadas publicadas. [Capturas](evidencias/) distinguem dados simulados da mensagem real de demonstração.

## Implantação ainda necessária

1. Concluir a matriz visual pendente e testar em staging com integrações reais. A suíte completa da API já passou; manter a branch em revisão até validar a implantação coordenada de API, bot e dashboard.
2. Preparar ambiente isolado com replica set, credenciais próprias e variáveis de email/segurança conforme [EMAIL.md](EMAIL.md). As credenciais locais não são automaticamente disponibilizadas à Vercel.
3. Fazer backup e revisar o dry-run dos índices. A migração pode remover o TTL antigo de exclusão direta de contas, criar índices únicos e criptografar tokens antigos; não é uma operação neutra de observação.
4. Disponibilizar a API que lê o formato legado e o novo formato criptografado **antes** de criptografar tokens existentes. Depois executar a migração controlada de índices/dados, validar a nova API e atualizar bot/dashboard. Evitar rollback para uma versão que não saiba ler tokens criptografados.
5. Conferir cookie entre os domínios publicados, OAuth de instalação/login/vínculo, recuperação com uma conta controlada, reabertura do console e recuperação de servidores após restart.
6. Validar Web Analytics e correlação dos cabeçalhos no destino publicado; medir os tempos reais. Não configurar um endpoint OTLP sem um coletor compatível aprovado.

## Modelos e evolução de produto

O [modelo lógico e relacional original](../auditoria-2026-10-14/MODELOS.md) permanece disponível, com dicionário, diagramas e proposta SQL. O [adendo desta implementação](MODELO-ADENDO.md) descreve códigos de email, OAuth, sessões, console e presença de guilda. Propostas SQL não foram aplicadas ao MongoDB.

O [estudo de concorrentes](CONCORRENTES.md) compara referências oficiais de Dyno, Carl-bot, Tatsu, Karuta, Statbot e OP.GG. Prioriza diagnóstico de configuração, histórico de casos, AutoMod com simulação, desejos/conquistas de coleção e perfis/estatísticas de jogos. São propostas de evolução, sem promessa de recursos já disponíveis ou contratação de serviços.

## Revisão no repositório

Branch enviada e [PR #9 em rascunho](https://github.com/YuriXbr/lumina-ecosystem/pull/9). O envio acionou previews automáticos da Vercel; isso não equivale a merge/publicação em produção nem à validação das integrações em staging. Segredos e arquivos de `.private` continuam fora do Git.
