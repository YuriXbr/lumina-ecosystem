# Entrega da auditoria — 14/10/2026

[Abrir versão HTML consolidada](auditoria.html), com relatório, diagramas SVG e dicionário.

1. [Relatório de segurança, usabilidade, estabilidade e features](RELATORIO.md).
2. [Modelos lógico e relacional, diagramas e plano de saneamento](MODELOS.md).
3. [Dicionário de 302 campos e índices reais](DICIONARIO-DADOS.md).
4. [DDL PostgreSQL proposto](modelo-relacional.sql) — documentação; não aplicado.

O MongoDB foi acessado com autorização, exclusivamente em leitura. Nenhum valor de documento pessoal, segredo ou token foi incluído nas evidências. A base atual é MongoDB; o SQL é um modelo normalizado proposto, não uma migração realizada.

## Reprodução

Da raiz do repositório, com as dependências da API instaladas:

```powershell
node docs/auditoria-2026-10-14/reproduzir-achados.cjs
```

O script acima usa stubs locais e não acessa rede/banco. Ele confirma problemas ainda existentes, não exige nem demonstra que foram corrigidos.

```powershell
node docs/auditoria-2026-10-14/inspecionar-mongo.cjs
node docs/auditoria-2026-10-14/gerar-dicionario.cjs
```

A inspeção lê MONGODB_URI do ambiente ou de `lumina-api/.env`, sem imprimir o valor. Usa o driver MongoDB nativo para impedir criação automática de índices. Ela atualiza o snapshot de metadados; a geração do dicionário também depende dos arquivos de auditoria npm/Jest produzidos na pasta TEMP durante esta análise.

## Evidências

- `mongo-metadata.json`: contagens, índices, tipos e verificações de integridade sem valores pessoais.
- `schema-declarado.json`: tipos e flags dos schemas do código.
- `validacao.json`: testes, versões travadas e advisories npm, separados entre total e produção.
- `reproducoes.json`: provas controladas de lógica.
- `login-desktop.png` / `login-estreito.png`: layout observado na prévia sem autenticação.
- `relatorio-renderizado.png`: conferência visual da versão HTML salva.
- `artefatos-validacao.json`: sintaxe PostgreSQL, destinos de FKs, links locais e presença dos SVGs renderizados.

Checks de sintaxe, build e testes não substituem validação de OAuth, moderação e persistência em staging. As limitações estão detalhadas no relatório.
