# Publicação corretiva — preparação em 24/10, conclusão em 25/10/2026

Esta publicação é a base corretiva anterior à **Zenith**. Não contém a nova economia, conversão de inventários em fragmentos ou recursos da atualização maior. A Zenith só pode ser publicada depois de bot, API e dashboard completos e validados em conjunto, conforme instrução do proprietário.

## Versões efetivamente promovidas

Commit de código: `80a67e068e9d0963ddcd492604d6c366a80171a1`.

| Componente | Deployment de produção preparado e testado | Domínio |
|---|---|---|
| API | `dpl_68YWwS8sjbQg1PLnHVNXZWLygbTe` | https://api-bot.luminasink.com |
| Dashboard | `dpl_Ca3TVVjAT8dsruQXKnvWTcgVif5Y` | https://bot.luminasink.com |

Foram usados builds de produção com `--skip-domain`, seguidos de validação e promoção explícita. Uma primeira preparação da API falhou por uma regra de exclusão de documentação ampla demais. Ela foi corrigida antes da promoção: os 133 arquivos necessários ao runtime foram encontrados no manifesto de upload, sem `.env`, `.private` ou credenciais locais.

## Banco e configuração

- Backup criptografado dos campos afetados de contas e dos metadados de índices, com round-trip de descriptografia verificado. Mantido exclusivamente em `.private/migrations/`, fora do Git e dos uploads.
- Dry-run: zero conflitos nas verificações de username, provedor Discord e badges.
- Migração de índices/backfill aplicada primeiro com `--apply --indexes-only`, preservando tokens legados durante a troca do leitor.
- Nova API promovida e conferida; em seguida o dashboard. Depois foi aplicada a criptografia dos tokens legados.
- Conferência posterior: nenhum campo de token legado em texto simples; índices únicos de username e provedor Discord presentes; TTL que excluía contas diretamente removido.
- Removidas 41 variáveis sem uso do dashboard e 27 da API na Vercel. Configuração de Gmail/recuperação adicionada somente à API de produção, com os valores privados marcados como sensíveis.
- Banco `lumina_development` criado no Atlas atual sem copiar dados pessoais. Por pedido explícito posterior, os segredos de produção continuam compartilhados temporariamente; banco e URLs locais permanecem separados.

Não fazer rollback para uma API antiga que só aceite tokens Discord em texto simples. Usar uma versão compatível com o envelope `v1` ou preparar restauração controlada dos campos afetados, considerando acessos posteriores ao backup.

## Evidências verificadas

- API: 74 suítes e 1.023 testes aprovados, incluindo MongoDB isolado e migração em etapas.
- Dashboard: 518 testes aprovados; build aprovado; lint com zero erros e 133 avisos legados.
- Bot: 18 testes locais aprovados; auditor de ambientes: 4 testes aprovados.
- SQL: adendo com 20 instruções, proposta combinada de 58 tabelas e 76 referências resolvidas; nenhuma execução em PostgreSQL.
- API publicada: `/health/ready` retorna `200 {"ok":true}`; sessão anônima retorna `200 {"authenticated":false}`; troca OAuth inválida retorna `400 INVALID_EXCHANGE`; CORS responde com a origem exata do dashboard.
- Dashboard publicado: `/privacy`, script principal e chunk da política retornam 200; os textos sobre localização aproximada constam no chunk publicado. O HTML público usa `index-SHTSJaSs.js` e a folha `index-DSrLM0ot.css`, correspondentes à nova versão.
- Cloudflare: o Managed Transform **Add visitor location headers** já estava habilitado no plano Free. Nenhuma assinatura ou compra foi feita.

## Limites e continuidade

O Chrome deixou de estar disponível na sessão após a conferência da Cloudflare. Não foi refeita uma autenticação real completa na versão nova, nem comprovada a captura da localização de uma pessoa real. Não afirmar que a matriz visual inteira ou todas as integrações estão validadas em produção. As evidências de estado preenchido/mobile anteriores continuam identificadas como fixtures.

O bot atual está em Docker local, com container em reinicialização. Foi apenas inspecionado. O proprietário determinou priorizar API/dashboard e a próxima atualização; nenhum container foi alterado ou reiniciado. Não houve heartbeat recente no console novo, portanto o novo transporte não foi validado com esse processo de produção.

Próxima etapa: desenvolvimento da **Zenith**, em branch própria, sem promoção ou merge que a leve à produção antes da conclusão conjunta dos três componentes.
