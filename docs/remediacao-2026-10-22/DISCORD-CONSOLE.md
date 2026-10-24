# Discord e console — iteração de 24/10/2026

Implementação na branch `codex/security-design-observability`. Nenhuma publicação de produção, instalação em servidor real ou migração no MongoDB de produção foi executada nesta iteração.

## Correções de Discord

| Problema | Causa observada no código | Alteração |
|---|---|---|
| Instalação retorna para endpoint inexistente | O modal incluía `response_type=code` e `redirect_uri` do login no convite de instalação; outras páginas dependiam das configurações padrão do portal. | Um gerador compartilhado usa `bot applications.commands` e contexto de servidor, sem callback de login. Todos os pontos de convite usam esse gerador. Não solicita Administrator. Client ID ausente não gera URL inválida. |
| Reautenticação em cada login | Login por senha retornava um objeto sem `discordOauth2TokenScope`; a área de membros tratava ausência como escopo antigo e abria um modal. O provider também forçava consentimento em todo login Discord. | Login, sessão e troca OAuth compartilham um DTO sem credenciais. Escopo ausente é desconhecido, sem modal automático. Escopo conhecido sem `guilds` gera aviso não bloqueante com reconexão explícita. Consentimento forçado somente no vínculo/reconexão. |
| Servidor adicionado durante uma queda não aparece | Registro dependia do evento `guildCreate`; o script `sync-guilds.js` só funcionava quando executado manualmente. | READY reconcilia o cache completo de servidores disponíveis; repete a cada cinco minutos, recuperando falhas da API. Metadados são atualizados de modo idempotente sem substituir prefixo, regras ou mensagens configuradas. |

O bot também sincroniza entradas ao vivo e registra saídas sem apagar a configuração. A reconciliação não reimporta todas as punições a cada reinício. Servidores indisponíveis são ignorados e revistos no próximo ciclo. A consulta de servidores do dashboard considera `botPresent=false` como ausência.

O [fluxo de instalação documentado pelo Discord](https://docs.discord.com/developers/topics/oauth2#bot-authorization-flow) dispensa código e callback quando são solicitados somente os escopos de instalação. O aplicativo deve estar configurado para instalação normal de bot, sem exigir o fluxo avançado de code grant. Nenhuma configuração do Developer Portal foi alterada automaticamente.

## Console compatível com a hospedagem atual

A documentação atual da [Vercel já informa suporte a WebSockets](https://vercel.com/docs/functions/websockets). Portanto, “a Vercel não suporta WebSocket” não é uma premissa atual do projeto. Ainda é necessário lidar com duração da função, reconexões e estado compartilhado entre instâncias. Nesta implementação o console utiliza HTTP e MongoDB, sem contratar infraestrutura de pub/sub.

Fluxo implementado:

1. O processo do bot captura mensagens de console em buffer limitado a 500 eventos, remove credenciais reconhecidas e envia lotes de até 100 eventos a cada dez segundos. Falhas preservam identificadores para repetição; a espera aumenta até um minuto. O erro do próprio transporte não realimenta o console.
2. A API exige chave interna **e** chave da API para ingestão, valida tamanho e tipos, remove credenciais novamente e grava eventos com ID único. Repetir o lote não duplica mensagens.
3. A tela administrativa consulta eventos posteriores ao cursor, mantém até 500 na exibição e busca páginas adicionais quando há atraso. Pausa em aba oculta ou por escolha do usuário; cancela consultas ao sair e aumenta o intervalo após falhas.
4. Eventos, sinais de atividade e diagnósticos têm retenção técnica de 24 horas. As leituras aplicam a validade antes mesmo da limpeza TTL. “Limpar exibição” afeta apenas a tela.
5. Estado, latência, memória e tempo ativo vêm do **processo do bot**, não dos contadores de uma instância da API. Ausência de sinal por 45 segundos aparece como estado não confirmado; não é apresentada como prova definitiva de queda do Discord.

### Diagnósticos

Disponíveis: `status`, `ping`, `guilds` e `help`. Não existe execução de JavaScript, shell, SQL, reinício remoto ou interpretação de argumentos arbitrários.

O administrador solicita via POST protegido por CSRF. O pedido recebe chave de idempotência, limite de seis solicitações por minuto por conta e prazo de dois minutos. O bot recebe um lease de 45 segundos; somente o processo e o token que receberam esse lease podem concluir o pedido. Após falha, outro processo pode recuperar o trabalho. Os diagnósticos são somente leitura e toleram repetição; isso não é promessa de execução exatamente uma vez de efeitos externos.

Rotas:

| Método | Rota | Acesso |
|---|---|---|
| POST | `/expapi/internal/guilds/sync` | Chave interna; lote de 1 a 100 servidores |
| POST | `/expapi/internal/guilds/leave` | Chave interna |
| POST | `/expapi/internal/bot-console` | Chave interna + chave da API |
| GET | `/expapi/v1/admin/bot-console?cursor=...` | Sessão atual de administrador ou superior |
| POST | `/expapi/v1/admin/bot-console/commands` | Mesma autorização + CSRF |

## Operação e limites

- API, bot e dashboard precisam receber a mesma versão da integração. O console fica sem sinal antes da atualização do processo do bot.
- Criar os índices únicos/TTL versionados antes de disponibilizar o console. O script `migrate-security.js` inclui os novos modelos, mas também contém a migração anterior de autenticação: seguir a ordem de implantação descrita no relatório e não executá-lo contra produção por tentativa.
- Apenas o bot mantém timers de ingestão e sincronização. A API não inicia workers residentes, conexões de console ou loops de espera.
- Requisições usam as cotas existentes de Vercel e MongoDB. Um bot ativo gera aproximadamente 8.640 chamadas diárias de ingestão antes de eventuais recuos; cada console visível gera até 12 leituras por minuto, mais páginas de recuperação. Não foi contratado serviço pago nem garantida capacidade ilimitada no plano gratuito.
- Logs anteriores ao início dessa integração não são recuperáveis. Eventos descartados após exceder o buffer local são sinalizados. A captura é operacional e não substitui uma plataforma completa de observabilidade.
- Saídas ocorridas enquanto o bot estava offline não são inferidas pela ausência em um lote parcial; a implementação preserva configurações. Uma futura reconciliação de remoções deverá considerar snapshots completos e shards.

## Evidência de validação

- 46 testes passaram na rodada focada de API: integração com MongoDB isolado, login e sessão. Inclui duplicação de lotes, paginação incremental, TTL, exclusão de leases concorrentes, resultado forjado, recuperação de lease, autorização atual e CSRF real.
- 13 testes do bot passaram, incluindo reconciliação, nova tentativa, coalescência, fila limitada, preservação de eventos durante envio e remoção de segredos.
- 10 testes iniciais do frontend passaram para console, convite e área de membros; as rodadas finais constam no relatório consolidado.
- Build do dashboard passou. Console preenchido e pausado inspecionado no desktop com **dados simulados**: [captura](evidencias/console-desktop.jpg). Após reconexão do Chrome, a versão mobile 390×844 foi inspecionada com eventos, pausa e diagnósticos simulados: [captura](evidencias/console-mobile.png).
- Nenhuma instalação real do bot, modificação de cargos ou punição de membros foi feita para validar estes fluxos.

A rodada final completa da API passou em 70 suítes e 1.002 testes. O frontend passou em 518 testes; as evidências e os limites atualizados estão em [RELATORIO.md](RELATORIO.md).
