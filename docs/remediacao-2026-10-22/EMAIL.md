# Verificação de email e recuperação de senha

Configuração do envio solicitada em 23/10/2026. Nenhuma assinatura, compra, alteração de faturamento ou envio para usuários reais foi realizado para implementar o recurso.

## Configuração local atualizada em 23/10

As credenciais OAuth fornecidas em `.private/credentials.json` foram copiadas apenas para `lumina-api/.env` e `.env.dev`, ignorados pelo Git. `MAIL_TRANSPORT=gmail_api` seleciona a API do Gmail; a biblioteca oficial do Google renova o acesso com o refresh token. A renovação foi aceita em uma chamada real. A pasta privada não entra em commits.

O segredo HMAC dos códigos foi gerado localmente, sem exibição. Os ambientes locais estão configurados; as variáveis da Vercel ainda não foram alteradas. Não foram criados serviços pagos nem modificadas configurações do Google Cloud.

### Teste real autorizado

Em 23/10/2026 às 12:44 (Brasília), foi enviado **um único email**, de `devenv@luminasink.com` para `devteam@luminasink.com`, assunto **Teste de integração Gmail · LuminaInk**. A API do Gmail confirmou o envio e a mensagem foi localizada na caixa de entrada da caixa central. O Gmail mostrou o remetente `devenv@luminasink.com`, destinatário `devteam@luminasink.com` e “enviado por: luminasink.com”. O HTML exibiu o aviso de demonstração, o código fictício `DEMO2345` e os links legais. Nenhum código ou link de bloqueio dessa mensagem é válido.

Evidência: [HTML recebido no Gmail](evidencias/email-gmail-entregue.jpg). Isso confirma a entrega deste teste de desenvolvimento; não valida automaticamente os aliases `verify@` e `noreply@`, nem constitui uma auditoria completa de SPF, DKIM e DMARC. Não houve segundo envio.

## O que preencher

O arquivo `lumina-api/.env.email.example` contém o modelo. As chaves ausentes também são acrescentadas aos arquivos locais existentes, sem substituir valores já definidos. Nunca publique os arquivos reais de ambiente.

| Chave | Preenchimento |
|---|---|
| `SMTP_USER` | Login da caixa Gmail que enviará, neste caso a caixa central informada pelo proprietário. |
| `MAIL_TRANSPORT` | `gmail_api` para as credenciais OAuth fornecidas; `smtp` para senha de app. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Credenciais OAuth do Gmail. Somente na API; já preenchidas localmente a partir do arquivo privado. O refresh token deve autorizar a caixa central e o escopo `https://www.googleapis.com/auth/gmail.send`. |
| `SMTP_PASS` | Senha de app gerada na conta Google, com verificação em duas etapas habilitada. Não usar a senha normal do Gmail. |
| `EMAIL_CODE_SECRET` | Segredo aleatório exclusivo, com pelo menos 32 caracteres. Gerar com um gerenciador de senhas; usar o mesmo valor em todas as instâncias da API. Sua rotação invalida os códigos pendentes. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | `smtp.gmail.com`, `465`, `true`. |
| `ACCOUNT_PUBLIC_ORIGIN` | Produção: `https://bot.luminasink.com`. Desenvolvimento: a origem local realmente usada, por exemplo `http://localhost:5173`. |
| `MAIL_FROM_VERIFY` | `verify@luminasink.com`: confirmação de email. |
| `MAIL_FROM_NOREPLY` | `noreply@luminasink.com`: recuperação de senha e alertas de segurança. |
| `MAIL_REPLY_TO` | `suporte@luminasink.com`. |
| `MAIL_FROM_DEV` | `devenv@luminasink.com`: todos os envios fora de produção. |
| `MAIL_DEV_RECIPIENT` | `devteam@luminasink.com`: todos os destinatários fora de produção são redirecionados para este endereço. |

Na Vercel, definir as mesmas variáveis na API. Usar `ACCOUNT_PUBLIC_ORIGIN` de produção apenas no ambiente de produção; previews devem ter origem permitida na API. O dashboard não recebe credenciais SMTP nem `EMAIL_CODE_SECRET`. Não há necessidade de comprar serviços no Google Cloud para a opção SMTP com senha de app.

## Gmail API com OAuth

Ativar Gmail API no projeto Google existente e obter autorização offline da própria caixa central com escopo `gmail.send`. Uma API key ou somente client ID/client secret não substituem o refresh token. O código usa a caixa definida em `SMTP_USER` no endereço da API, gera MIME localmente com Nodemailer e envia por `messages.send` via biblioteca oficial `google-auth-library`. Não registra credenciais nem renovações em logs. Não tenta repetir falhas transitórias de envio, pois uma repetição após resposta perdida pode duplicar a mensagem.

Referências: [envio MIME e base64url na Gmail API](https://developers.google.com/workspace/gmail/api/guides/sending), [OAuth offline](https://developers.google.com/identity/protocols/oauth2/web-server#offline), [Nodemailer: MIME local](https://nodemailer.com/transports/stream).

## Preparação no Gmail

1. **Apenas se usar `MAIL_TRANSPORT=smtp`:** na conta Google remetente, habilitar a verificação em duas etapas e criar uma **senha de app** para Lumina API. Preencher `SMTP_USER` e `SMTP_PASS` em local privado. Algumas contas ou políticas podem não oferecer senhas de app; nesse caso o código precisa de autenticação OAuth2 antes de usar o envio, sem recorrer à senha normal.
2. No Gmail, Configurações → Contas e importação → **Enviar email como**, verificar os aliases `verify@`, `noreply@` e `devenv@`. O encaminhamento de entrada pela Cloudflare não autoriza automaticamente o remetente de saída. Confirmar o cabeçalho From de um email de desenvolvimento recebido: o Gmail pode reescrever remetentes não autorizados.
3. Os aliases configurados com ação **Drop** não recebem mensagens. Para confirmar um alias no Gmail, pode ser necessário encaminhá-lo temporariamente à caixa central e depois restaurar a regra. Essas alterações não são realizadas automaticamente por esta implementação.
4. Verificar SPF/DKIM/DMARC do domínio para o serviço remetente realmente autorizado. Não adicionar múltiplos registros SPF nem presumir que uma conta Gmail pessoal oferece a mesma assinatura DKIM de um domínio Google Workspace. Conferir os resultados de autenticação na mensagem recebida antes de liberar produção.
5. Testar primeiro fora de produção: remetente `devenv@`, destinatário `devteam@`. Depois configurar produção e testar o fluxo com uma conta controlada.

Referências oficiais: [Gmail: enviar como outro endereço](https://support.google.com/mail/answer/22370?hl=pt-BR), [Google: senhas de app](https://support.google.com/accounts/answer/185833?hl=pt-BR), [Nodemailer com Gmail](https://nodemailer.com/guides/using-gmail), [SMTP](https://nodemailer.com/smtp).

## Regras implementadas

- Código com oito letras/números legíveis, gerado com aleatoriedade criptográfica, validade de 15 minutos e uso único. O banco guarda HMAC, nunca o código em texto. Cinco erros esgotam o código.
- Um código ativo por conta, compartilhado entre verificação e recuperação; novo envio invalida o anterior. Intervalo mínimo de 60 segundos e limites por IP em armazenamento compartilhado.
- Pedido retorna a mesma resposta para conta inexistente, suspensa, já verificada ou com envio bloqueado. Falta de configuração SMTP retorna indisponibilidade para qualquer endereço.
- Botão **Não solicitei o código** abre uma confirmação. A abertura do link não faz alterações; somente o POST explícito cancela e bloqueia novos códigos de ambos os fluxos por 24 horas. O link é aleatório, de uso único e válido por 24 horas; um email anterior ainda pode bloquear códigos posteriores.
- Bloqueio não altera a senha, não bloqueia o login normal e não pode ser contornado solicitando um código de outra finalidade. O prazo é conferido no servidor; os índices TTL apenas limpam registros antigos.
- A recuperação confirma o email e troca a senha na mesma transação que consome o código, incrementando a versão das sessões. Um código emitido antes de outra alteração de senha não pode redefini-la depois.
- Registro direciona para confirmação; configurações oferecem o fluxo para contas não verificadas. Login oferece **Esqueci minha senha**. A verificação não atribui cargo administrativo: usar endereço `admin@` é uma convenção, nunca uma concessão automática de privilégios.
- Contato geral: `contato@`; suporte: `suporte@`/`suporteluminabot@`; copyright: `dmca@`; avisos internos: `warning@`. Estes endereços não concedem permissões no sistema.

## Implantação e validação

Aplicar a migração de índices descrita no relatório antes do tráfego de produção. O MongoDB precisa oferecer transações (replica set/Atlas). Testes usam replica set temporário, transporte de email simulado e nenhum destinatário externo. A entrega real e a autenticação dos remetentes dependem da configuração do Gmail preenchida pelo proprietário.
