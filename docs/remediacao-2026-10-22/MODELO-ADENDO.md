# Adendo aos modelos lógico e relacional

Complementa o [levantamento de 14/10](../auditoria-2026-10-14/MODELOS.md), sem substituir o retrato histórico do MongoDB. Os elementos abaixo foram declarados no código da branch; **não foram aplicados como migração SQL nem conferidos como coleções de produção em 24/10**.

## Modelo lógico

```mermaid
erDiagram
    ACCOUNT ||--o| EMAIL_CODE_STATE : possui
    ACCOUNT ||--o{ EMAIL_CODE_REJECTION : recebe
    ACCOUNT ||--o{ BOT_DIAGNOSTIC : solicita
    BOT_WORKER ||--o{ BOT_CONSOLE_EVENT : origina
    BOT_WORKER ||--o{ BOT_DIAGNOSTIC : processa
    GUILD ||--o| GUILD_PRESENCE : registra
```

| Entidade | Identidade e relacionamento | Restrições e ciclo de vida |
|---|---|---|
| Estado de código | Um registro por `accountId`; conta tem zero ou um estado. | `purpose` verify/reset; HMAC do código, versão da credencial, validade, tentativas e bloqueio compartilhado. Novo pedido substitui o código. Validade de 15 min; bloqueio de 24 h; limpeza técnica após dois dias. |
| Recusa de código | Várias recusas por conta; hash do token único. | Cada email possui link próprio válido por 24 h. Consumo único em transação; permite invalidar um código posterior da mesma conta. |
| Revogação de sessão | Hash do JWT, sem armazenamento do JWT original. | Consulta até sua expiração; índice único e TTL. A conta também possui versão de sessão. |
| Transação OAuth | Hash único do nonce do navegador. | Uso único; validade de dez minutos. Origem e intenção são protegidas no state assinado. |
| Troca OAuth | Hash único do código; origem e hash do vínculo com navegador. | Sessão criptografada no servidor; validade de 60 s; consumo único vinculado a origem e cookie. |
| Evento do console | `eventId` UUID único, origem `workerId`; `_id` Mongo serve de cursor de ingestão. | Mensagem limitada, nível validado, data de ocorrência e de ingestão separadas; leitura/limpeza de 24 h. |
| Processo do bot | `workerId` UUID por execução; `botId` Discord. | Sinal de atividade e medidas reais do processo; sinal ativo por 45 s, registro temporário de 24 h. A relação com eventos é histórica e não exige que o worker continue ativo. |
| Diagnóstico do bot | UUID de pedido único, conta solicitante e comando permitido. | Prazo de dois minutos; lease de 45 s com token exclusivo; estados pending/running/completed/failed. A leitura apresenta expired depois do prazo. Retenção de 24 h. |
| Presença do bot na guilda | Embutida no documento `guilds`, sem criar coleção separada. | `botPresent` e `lastSyncedAt`; reconciliação altera metadados, não regras. Saída preserva configuração. |

No MongoDB, as referências acima são campos e regras da aplicação; não são chaves estrangeiras executadas pelo banco. Índices únicos/TTL estão em `lumina-api/src/database/indexes.js`; a migração é explícita em produção.

## Proposta relacional complementar

[adendo-relacional.sql](adendo-relacional.sql) usa a tabela `account` e a tabela `guild` da proposta original. Inclui PK, FK, UNIQUE, CHECK e índices de consulta; não depende de inferir IDs de conta como UUID, pois os IDs atuais são texto.

SQL não oferece a mesma limpeza automática dos índices TTL do MongoDB: uma implantação PostgreSQL precisaria de job de expiração, armazenamento dos hashes/credenciais com os mesmos controles e transações equivalentes. O script é documentação de normalização, não uma migração do banco em uso.

Validação de 24/10: sintaxe aprovada pelo parser PostgreSQL `pglast 8.7`; os destinos de referências são confrontados com a proposta histórica. Nenhum banco PostgreSQL foi criado ou alterado. O adendo seleciona explicitamente o schema `lumina_model`, porque o `SET LOCAL` do script original termina no `COMMIT`.
