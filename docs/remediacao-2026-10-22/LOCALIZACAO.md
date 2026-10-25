# Localização aproximada no cadastro e no último login

Implementação em `lumina-api/src/utils/accountRequestMetadata.js`, usada em cadastro com senha, login e callback Discord. Persiste país, região, cidade, apresentação da localização, fonte, IP e navegador. Mantém o registro inicial e apenas um registro de último acesso; falhas de autenticação não substituem o último login. Não consulta API externa por acesso, não exige chave adicional e não captura GPS/latitude/longitude.

## Fonte e configuração conferida

O proprietário solicitou expressamente a Cloudflare como fonte. Em 24/10 foi conferido no painel de `luminasink.com`, no plano **Free**, que **Rules → Settings → Managed Transforms → Add visitor location headers** já está habilitado. Nenhuma configuração, assinatura ou compra foi alterada nesse painel.

- [Cloudflare: IP geolocation](https://developers.cloudflare.com/network/ip-geolocation/) explica o fornecimento de país e dos demais cabeçalhos pelo Managed Transform.
- [Redes Cloudflare IPv4](https://www.cloudflare.com/ips-v4) e [IPv6](https://www.cloudflare.com/ips-v6) são a origem da lista versionada e conferida em 24/10.
- [Vercel: request headers](https://vercel.com/docs/headers/request-headers) documenta a substituição do IP encaminhado para evitar spoofing. O código verifica `x-vercel-forwarded-for`/`x-real-ip` apenas dentro do ambiente Vercel e exige um peer de rede Cloudflare antes de aceitar `cf-*`.
- [Vercel: limite atrás de proxy](https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions) explica por que não usamos o país/cidade da Vercel como se fossem os do usuário quando a Cloudflare é o proxy.

Cabeçalhos falsificados enviados diretamente ao domínio da Vercel ou ao Node local são ignorados. Campos ausentes/inválidos ficam vazios com fonte `unavailable`; IPs de VPN, operadora ou rede corporativa podem refletir a saída de rede, não a cidade real. A localização nunca concede permissões nem serve como prova de identidade. Se a origem passar a usar outra cadeia de proxies, revisar a validação de peer antes de confiar nesses cabeçalhos.

## Privacidade e dados históricos

A política pública informa finalidade de segurança, precisão aproximada e substituição do último registro. Os campos não entram em respostas comuns de login/sessão ou perfis públicos. O cadastro original não é reescrito no login. O código não reconstrói cidades de cadastros antigos que não tinham essa informação.

## Validação

- Dez testes do extrator cobrem peer Vercel/Cloudflare, IPv6, IPv4 mapeado, cabeçalhos forjados, caracteres inválidos, arrays, origem direta e ausência de coordenadas.
- Três testes com MongoDB isolado cobrem HTTP de cadastro/login, preservação do cadastro, tentativa de localização pelo corpo do formulário, falha de senha e criação OAuth com persistência dos dois registros.
- A conferência do painel confirma disponibilidade dos cabeçalhos. A captura de uma localização real na versão nova depende de publicação e novo cadastro/login real; não foi simulada como se já fosse uma evidência de produção.
