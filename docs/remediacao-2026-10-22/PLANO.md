# Plano de desenvolvimento e validação — 22/10/2026

Base: main sincronizada (cbfa458). Branch: codex/security-design-observability.

## Objetivos e sequência

1. Corrigir integridade de diária, baús e badges; índices versionados e testes de concorrência/falhas com MongoDB isolado.
2. Corrigir autenticação, OAuth, revogação de sessão, privacidade, validação e configuração por gestor Discord; manter contratos bot/API/dashboard alinhados.
3. Corrigir scheduler, conexão/inicialização, shutdown, proxy, timeouts, headers, dependências e execução reproduzível na Vercel.
4. Consolidar tokens de design, shell/navegação, botões/formulários, feedback, modais e estados; revisar todas as rotas em desktop/mobile com matriz de estados anônimo, membro, staff, loading, vazio e erro.
5. Reduzir bundle e chamadas redundantes; medir build e tempos reais, sem apresentar dados simulados como produção.
6. Integrar Web Analytics Cloudflare configurável e correlação/rastreabilidade da API. Confirmar produto/destino e credenciais fora do código; DNS Cloudflare não equivale a um coletor de traces do backend.
7. Pesquisar ferramentas de bots concorrentes em fontes oficiais e entregar comparação e roadmap alinhados a moderação, entretenimento, coleção e estatísticas.
8. Executar testes/lint/build, testes integrados isolados, inspeção visual e documentação de cobertura/limitações. Commits por etapa; preparar revisão sem alterar produção silenciosamente.

## Critérios de aceite

- Recursos e quotas não duplicam sob concorrência; falhas não consomem baú sem prêmio.
- Sessões revogadas/suspensas são recusadas; OAuth valida transação de uso único ligada ao navegador.
- Gestor Discord configura sua própria guilda sem receber privilégios globais.
- Valores salvos sobrevivem a releitura e são consumidos pelo bot com as mesmas chaves/unidades.
- Punições temporárias mantêm tipo/prazo e sobrevivem a restart com processamento recuperável.
- Páginas compartilham identidade visual, estados acessíveis e navegação consistente.
- Telemetria é opt-in/configurável, sem segredos/PII em eventos e sem bloquear respostas quando indisponível.
- Evidências distinguem testes com mocks, banco isolado, conta real e ambiente publicado.

## Decisões de execução

- Preservar React/Express/MongoDB e infraestrutura Vercel/Cloudflare existentes.
- Usar ambiente MongoDB isolado para testes de escrita e concorrência.
- Aguardar apenas dados necessários ao destino Cloudflare e login real; continuar as demais etapas independentemente.


## Ampliação autorizada em 23/10

- Verificação de email e recuperação da senha com código alfanumérico de 8 caracteres, TTL de 15 minutos, uso único, cinco tentativas e limite de envio.
- Link de recusa abre confirmação explícita; POST invalida códigos e bloqueia os dois fluxos por 24 horas.
- Gmail SMTP, emails HTML e texto, aliases por finalidade, destinatário isolado em desenvolvimento. Nenhuma compra ou assinatura autorizada.
- Configuração com segredos em branco e instruções de Gmail; testes transacionais e de concorrência em MongoDB isolado.

## Iteração autorizada em 24/10

1. Separar instalação do bot e login OAuth: convite canônico sem callback de login, com escopos explícitos e permissões mínimas.
2. Unificar os dados retornados por login, sessão e troca OAuth; não interromper cada login com uma solicitação de escopo presumida.
3. Reconciliar servidores no início e periodicamente, com atualização idempotente de metadados e preservação das configurações existentes.
4. Substituir o console desativado por eventos e comandos de diagnóstico persistidos no MongoDB, ingestão autenticada pelo bot e leitura incremental via HTTPS para administradores. Sem shell remoto, serviços adicionais pagos ou estado dependente de uma instância Vercel.
5. Cobrir as regressões com testes isolados, build e revisão visual; registrar limites da validação e produzir commits na branch de trabalho.
6. Se o limite de uso impedir a continuação, agendar retomada neste chat após a reposição. Há disponibilidade na consulta inicial de 24/10; nenhum agendamento duplicado foi criado.

## Resultado da validação final de 24/10

- API: 70 suítes, 1.001 testes aprovados; contratos e fixtures isolados, sem relaxar o runtime.
- Dashboard: 79 arquivos, 517 testes aprovados; build e lint sem erros (137 avisos legados).
- Revisão mobile ampliada para inventário preenchido/vazio, seletor/filtros, membros vinculados/sem Discord, email/recuperação/recusa, console, Sobre e planos. Sessão indisponível conferida em desktop.
- SQL complementar: parser PostgreSQL aprovado e referências resolvidas contra a proposta original; sem executar migração.
- Pendentes: matriz visual completa, confirmação comercial dos planos, staging e publicação coordenada. Nenhuma contratação ou compra.
