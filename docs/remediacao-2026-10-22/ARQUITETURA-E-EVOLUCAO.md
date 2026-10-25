# Plano de evolução arquitetural — 24/10/2026

Autorização: refazer módulos e fluxos quando necessário para qualidade, segurança e escala. A autorização inclui atualizações relevantes; não equivale a garantia de risco zero, contratação de serviços ou mudança silenciosa de dados em produção.

## Ordem de execução

1. **Configuração e publicação:** inventário das variáveis por componente; remover configuração morta e segredos do frontend; documentar parâmetros de SDK/plataforma; manter credenciais privadas e preservar chaves de criptografia existentes. Validar API e dashboard em conjunto antes de promover a versão.
2. **Fundação da API:** configuração validada no início, autorização por recurso, contratos de entrada/saída explícitos, paginação e limites, operações idempotentes e índices versionados. Separar regras de negócio dos adaptadores HTTP/Discord e do acesso ao MongoDB. Extrair módulos progressivamente, com testes de contrato e concorrência, preservando comportamento público até uma migração explícita.
3. **Processamento e observabilidade:** API HTTP sem estado dependente de uma instância; bot como worker do gateway Discord; tarefas persistidas com lease, expiração e retomada. Limites de pool/conexões, timeouts, correlação de requisições e métricas sem credenciais/PII. Dimensionar com medição de p95/p99, concorrência e índices, em vez de supor capacidade ilimitada.
4. **Frontend:** um sistema de componentes e tokens, composição de páginas por funcionalidades, cache de consultas com invalidação explícita, carregamento por rota e estados consistentes (carregando, vazio, erro, acesso negado). Validar teclado, foco, contraste e mobile, além dos estados autenticados reais. Não confundir fixtures com evidência de produção.
5. **Moderação:** revisar permissões/hierarquia e comandos existentes; adotar timeout e AutoMod nativos onde adequados; configuração guiada de cargos/canais com prévia das alterações e diagnósticos de permissões. Ações auditadas, repetíveis com segurança e com tratamento de falha parcial.
6. **Coleção/economia:** módulo próprio, separado de autenticação/moderação, com transações e identificadores de operação. Economias global e por servidor isoladas na chave de todas as operações. Implementar inventário de fragmentos e permanentes, livro de movimentos de essência, limites de emissão, rolls/claims e trocas antes de conquistas e rankings.

## Regras já definidas para a economia

- Inventário global existente será convertido em fragmentos por migração versionada e verificável. Essa migração não faz parte da publicação corretiva do dashboard.
- Só permanentes contam para coleção; desencantar consome fragmento e credita essência; ativar consome fragmento e essência na mesma transação.
- Propor tabela configurável de valores por raridade para aprovação antes da liberação.
- Padrão por servidor: 8 rolls/hora, 5 permanentes da mesma skin, 2 claims por período normal. Administrador configura limites dentro dos direitos do plano; valores VIP ainda dependem de definição comercial.
- Reset diário e por voto alteram apenas rolls, nunca claims. Definir reposição versus acúmulo antes de implementar esses dois créditos.
- Modos collection e competitive, desejos por servidor, progresso, conquistas/recompensas, XP/upgrades e rankings. Menções só de usuários que aderiram à lista; limites de mensagem e abuso tratados explicitamente.
- Troca de permanentes: cada participante pode concluir uma troca/dia; aceite de ambos, expiração e transferência atômica sem duplicação. Definir fuso do dia e regras de cancelamento antes da liberação.

## Critérios de qualidade e liberação

- Regras críticas testadas com MongoDB isolado, incluindo concorrência, indisponibilidade, repetição e autorização cruzada entre servidores.
- Migrações com dry-run, backup/restauração e estratégia de compatibilidade entre leitores antigos e novos. Nunca criptografar tokens enquanto o leitor ativo só aceita texto simples.
- Contratos bot/API/dashboard compatíveis; comparação dos ambientes sem exibir valores privados.
- Build, testes e validação visual do commit a publicar; smoke test da API e dos fluxos públicos/autenticados após promoção. Plano de rollback considera também o formato dos dados.
- Atualizações de dependências avaliadas por compatibilidade e necessidade. Evitar troca de framework ou reescrita total sem um problema demonstrado que justifique o custo e o risco.

## Evidências atuais e limites

O dry-run de segurança de 24/10 consultou o MongoDB sem escrever: zero grupos duplicados de username, provedor Discord e badges. Identificou dois índices legados (`usernameLower_1` e TTL `deletionScheduledFor_1`) a tratar na migração. Isso não comprova que todos os índices novos estejam aplicados, nem autoriza concluir que o banco está pronto para a nova economia.

O build e os testes locais documentados no relatório estão aprovados para o commit anterior a esta etapa. A API publicada ainda usa o contrato OAuth antigo; dashboard novo e API precisam de publicação coordenada. A matriz visual completa e a medição de carga real permanecem critérios de trabalho, não resultados já alcançados.
