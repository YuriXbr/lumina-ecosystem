# Analytics e rastreabilidade

O dashboard inclui o beacon oficial do Cloudflare Web Analytics no domínio `luminasink.com`, apenas em build de produção. O identificador do site é público; `VITE_CF_WEB_ANALYTICS_TOKEN` pode substituí-lo. A integração detecta scripts já presentes para evitar duplicação quando a Cloudflare injeta o beacon automaticamente.

O [Web Analytics](https://developers.cloudflare.com/web-analytics/about/) mede navegação e desempenho do frontend. Não é um endpoint para receber logs, eventos arbitrários ou traces OTLP do backend. O plano gratuito não foi tratado como autorização para contratar outro produto.

A API gera `X-Request-Id`, aceita e devolve correlação W3C `traceparent`, inclui `Server-Timing` e relaciona `CF-Ray` quando o cabeçalho está presente e tem formato válido. Esses cabeçalhos não concedem confiança ou autenticação. O bot registra o request ID das falhas da API sem copiar o payload da chamada.

OpenTelemetry na API é configurável por `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` HTTPS e pelas variáveis padrão do exportador. O destino permanece sem configuração; não foi inventado um coletor Cloudflare nem enviado OTLP ao endpoint de métricas de navegador. A exportação falha de forma isolada e usa `waitUntil` na Vercel para concluir trabalho pendente.

Não foram modificados DNS, faturamento, Workers, planos ou variáveis da Vercel nesta implementação. O funcionamento do beacon, os cabeçalhos do ambiente publicado e as métricas reais devem ser conferidos depois da publicação. Redução de bundle local não equivale a comprovação de melhoria de LCP ou latência em produção.
