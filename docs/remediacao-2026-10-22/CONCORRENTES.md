# Ferramentas para a evolução do Lumina

Pesquisa de fontes oficiais consultadas em 22–24/10/2026. As sugestões são propostas de produto; não representam funcionalidades já implementadas no Lumina. Não foram contratados planos, comprados serviços ou assumidos preços de concorrentes.

## Referências e oportunidades

| Referência | Oferta confirmada | Oportunidade para o Lumina |
|---|---|---|
| [Dyno AutoMod](https://docs.dyno.gg/modules/automod) e [moderação](https://docs.dyno.gg/modules/moderation) | Filtros de spam/palavras e configuração de punições, canais de registro e papéis de moderação. | Regras com prévia, exceções por canal/cargo e um histórico de casos acessível no dashboard. |
| [Carl-bot](https://carl.gg/onboarding/1) e [documentação](https://docs.carl.gg/) | Reaction roles, automod, registros, sugestões, mensagens recorrentes e comandos personalizados. | Menus de cargos, painel de sugestões e editor de mensagens com prévia. A execução deve compartilhar o contrato usado no dashboard. |
| [Tatsu](https://tatsu.gg/economy) | Economia global e pontos por servidor, recompensas, itens cosméticos e personalização. | Progressão da coleção, conquistas e recompensas por objetivos, com limites contra exploração e spam. |
| [Karuta](https://karuta.com/) | Coleção, trocas e melhorias de cartas em uma economia compartilhada. | Álbuns por campeão/tema, vitrine da coleção e evolução cosmética; trocas apenas após reserva e histórico transacional. |
| [Statbot](https://docs.statbot.net/docs/guide/dashboard/) e [visão geral](https://docs.statbot.net/) | Estatísticas de atividade e dashboard, incluindo mensagens, voz e jogos; análises avançadas dependem do produto/plano. | Estatísticas simples de comunidade, período selecionável, explicação das métricas e controle da coleta pelo servidor. |
| [OP.GG Bot](https://bot.op.gg/discord) | Histórico e estatísticas de LoL, rankings, tiers/builds de campeões e preferências de região/tier. | Riot ID e região salvos, comparação de partidas e ranking entre participantes do servidor. |

O melhor espaço para o Lumina é combinar comunidade de LoL, coleção e moderação em um fluxo consistente. Essa conclusão é uma escolha de produto a partir das referências e do código atual; não é uma afirmação de que os concorrentes não oferecem outras ferramentas.

## Ordem sugerida

| Prioridade | Entrega | Bot | Dashboard | Critério de aceite |
|---|---|---|---|---|
| P0 | Diagnóstico do servidor | `/diagnostico` verifica canais, cargos e permissões necessárias. | Explica o que falta e mostra a alteração necessária antes de ativar módulos. | Canal removido ou cargo acima do bot gera uma orientação precisa, sem mostrar sucesso falso. |
| P0 | Histórico de casos | Toda advertência/ban/mute recebe ID, autor, motivo e estado. | Busca por membro, filtros e linha do tempo; alteração auditada. | Uma punição pode ser rastreada até o comando e a resposta da API. |
| P1 | AutoMod com simulação | Regras de spam, menções e links; integração com AutoMod nativo quando aplicável. | Prévia da decisão, exceções e modo de observação antes de punir. | Regras podem ser testadas sem sancionar membros reais. |
| P1 | Coleção e objetivos | Favoritos, lista de desejos e conquistas por conjunto. | Progresso por campeão/linha temática, faltantes, duplicatas e coleção em destaque. | A lista de desejos não altera o inventário e respeita a visibilidade escolhida. |
| P1 | Perfil de jogador | Riot ID + região salvos; consultas e resumo de partidas. | Última atualização, histórico e comparação por período. | Cache respeita região/identidade; 429 mostra espera e não dispara uma cascata de novas chamadas. |
| P1 | Ranking opt-in do servidor | Ranking de participantes cadastrados. | Filtros por fila/temporada e explicação de empates. | Usuário pode entrar/sair e remover o vínculo; dados incompletos ficam identificados. |
| P1 | Entretenimento controlado | Quiz de LoL, missões semanais e desafios de comunidade. | Calendário e regras visíveis, orçamento de recompensas configurável. | Recompensa é única por objetivo/período; spam não aumenta ganhos. |
| P2 | Forja de duplicatas | Conversão de duplicatas em recursos e receitas claras. | Simulação do custo e confirmação antes de consumir itens. | Débito e resultado na mesma transação, com histórico e proteção contra repetição. |
| P2 | Trocas de coleção | Oferta entre usuários, validade e confirmação das duas partes. | Comparação dos itens e acompanhamento do estado. | Itens reservados não podem ser gastos em outra operação; cancelamento/expiração devolvem a reserva uma única vez. |
| P2 | Moderação assistida | Recursos contra punição e ações de revisão. | Fila de recursos, decisão humana e registro da justificativa. | Recurso não reverte punição automaticamente nem expõe dados de outro servidor. |
| P2 | Engajamento | Contagens agregadas de voz/mensagens e atividades. | Gráficos de 7/30 dias, exportação e opções de retenção. | A coleta pode ser desativada; exclusão e permissões são testadas. |
| P2 | Eventos e sugestões | Inscrições, enquetes, lembretes e sugestões. | Agenda, critérios de participação e moderação das sugestões. | Reexecução de um job não envia lembretes ou entrega prêmios duplicados. |

## Dependências de engenharia

- Consolidar casos e eventos com identificadores imutáveis. Idempotência deve valer entre bot, API e dashboard, incluindo reinício e repetição de chamadas.
- Usar as filas com lease como base de execução; efeitos no Discord precisam de tratamento idempotente e verificação de ações posteriores. Não há transação distribuída entre MongoDB e Discord.
- Para trocas/forja, introduzir saldo/reserva e um ledger de operações; o array atual de IDs preserva cópias, mas não oferece identidade individual e reserva transacional de cada exemplar. Ampliar o modelo antes de abrir um mercado.
- Manter skins como coleção virtual do Lumina, com descrição explícita. Não prometer transferência para uma conta Riot ou valor monetário sem uma implementação e validação específicas.
- Separar identidade pública, vínculos Discord/Riot e consentimento. Estatísticas de servidor e de jogo precisam informar origem e data; não exibir um número aproximado como atualização ao vivo.
- As [regras da API Riot](https://developer.riotgames.com/docs/portal) exigem tratamento dos limites por aplicação/método/serviço e respeito ao `Retry-After`. A chave e a autorização adequadas ao uso público devem ser validadas antes da expansão.

## O que validar com usuários

Começar por diagnóstico, histórico de casos, coleção com desejos e perfil de jogo. Observar conclusão das tarefas, falhas, retorno em 7 dias e uso de cada módulo. Reduzir a prioridade de recursos que aumentam complexidade sem melhorar esses fluxos. Música, mercado com dinheiro e integrações pagas não são pré-requisitos desse plano.

## Síntese de produto — 24/10

Minha recomendação é priorizar três entregas: histórico de casos de moderação, desejos/conquistas da coleção e perfil Riot com ranking voluntário. Na sequência, missões semanais e quiz de LoL ligam entretenimento à coleção, com recompensas por objetivo em vez de volume de mensagens. AutoMod com simulação e diagnóstico de permissões reduzem erros de operação. Estatísticas agregadas de comunidade e menus de cargos/sugestões completam o dashboard.

Desejos, simulação, missões e a combinação entre esses módulos são propostas para o Lumina; não são apresentados como recursos confirmados de cada concorrente. As referências acima são exemplos de produto, sem afirmar participação de mercado ou que todos os recursos dos concorrentes sejam gratuitos.
