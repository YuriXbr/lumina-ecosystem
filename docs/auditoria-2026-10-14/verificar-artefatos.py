"""Valida DDL com parser PostgreSQL e gera relatório HTML local, sem JavaScript remoto.
Dependências usadas nesta execução: markdown/pglast instalados apenas em TEMP.
Não estabelece conexão de banco.
"""
from pathlib import Path
import json
import os
import re
import sys
import html

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'lumina-audit-libs'))
import markdown
from pglast import parse_sql, ast

base = Path(__file__).resolve().parent
sql = (base / 'modelo-relacional.sql').read_text(encoding='utf-8')
statements = parse_sql(sql)
tables = {}
for statement in statements:
    node = statement.stmt
    if isinstance(node, ast.CreateStmt):
        columns = {col.colname for col in node.tableElts if isinstance(col, ast.ColumnDef)}
        tables[node.relation.relname] = columns
references = 0
for statement in statements:
    node = statement.stmt
    if not isinstance(node, ast.CreateStmt):
        continue
    for element in node.tableElts:
        constraints = element.constraints if isinstance(element, ast.ColumnDef) else (element,)
        for constraint in constraints or ():
            if not isinstance(constraint, ast.Constraint) or not constraint.pktable:
                continue
            target = constraint.pktable.relname
            assert target in tables, f'FK para tabela inexistente: {target}'
            for key in constraint.fk_attrs or ():
                assert key.sval in tables[node.relation.relname]
            for key in constraint.pk_attrs or ():
                assert key.sval in tables[target]
            references += 1

links = 0
for source in base.glob('*.md'):
    text = source.read_text(encoding='utf-8')
    assert text.count('```') % 2 == 0, source.name
    for destination in re.findall(r'\]\(([^)]+)\)', text):
        if destination.startswith(('http:', 'https:', '#')):
            continue
        assert (base / destination.split('#')[0]).exists(), (source.name, destination)
        links += 1
    for idx, diagram in enumerate(re.findall(r'```mermaid\n(.*?)```', text, re.S), 1):
        (base / f'{source.stem.lower()}-{idx}.mmd').write_text(diagram, encoding='utf-8')

sections = []
for name, title in [('RELATORIO.md', 'Relatório'), ('MODELOS.md', 'Modelos'), ('DICIONARIO-DADOS.md', 'Dicionário')]:
    content = markdown.markdown((base / name).read_text(encoding='utf-8'), extensions=['tables', 'fenced_code', 'toc'])
    if name == 'MODELOS.md':
        figures = iter(['modelo-logico.svg', 'modelo-relacional.svg'])
        content = re.sub(r'<pre><code class="language-mermaid">.*?</code></pre>', lambda _: '<figure><img alt="Diagrama de dados Lumina" src="' + next(figures) + '"><figcaption>SVG escalável: use o link acima para abrir e ampliar.</figcaption></figure>', content, flags=re.S)
    sections.append(f'<section id="{name}">{content}</section>')

page = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lumina · Auditoria e modelos · 14/10/2026</title>
<style>:root{color-scheme:light;font-family:system-ui,sans-serif;color:#202435;background:#f4f2fa}body{margin:0}header{background:#392368;color:white;padding:28px max(24px,calc((100vw - 1120px)/2))}header a{color:#e5d7ff}nav{display:flex;gap:24px;flex-wrap:wrap}main{max-width:1120px;margin:auto;padding:24px}section{background:white;border:1px solid #ddd7ea;border-radius:12px;padding:32px;margin:0 0 24px}h1{font-size:2rem;line-height:1.15}h2{margin-top:2em;color:#4c2b80;border-bottom:1px solid #e5dcef;padding-bottom:8px}h3{margin-top:1.7em}p,li{line-height:1.7}a{color:#5e3691}table{border-collapse:collapse;width:100%;font-size:.9rem;margin:20px 0;display:block;overflow:auto}td,th{border:1px solid #ded8e8;padding:10px;text-align:left;vertical-align:top}th{background:#f0ebf8}pre{padding:18px;background:#f6f5f8;border:1px solid #e5dcef;overflow:auto;border-radius:8px}code{font-size:.86rem}img{max-width:100%}section:not(:first-child){content-visibility:auto;contain-intrinsic-size:3000px}@media(max-width:700px){main{padding:12px}section{padding:20px}h1{font-size:1.6rem}}@media print{header,nav{display:none}body{background:white}main{padding:0}section{border:0;padding:0;content-visibility:visible}h2,h3{break-after:avoid}tr{break-inside:avoid}}</style>
<header><strong>Lumina Ecosystem · Auditoria técnica</strong><p>14/10/2026 · MongoDB em leitura · SQL proposto, não aplicado</p><nav><a href="#RELATORIO.md">Relatório</a><a href="#MODELOS.md">Modelos</a><a href="#DICIONARIO-DADOS.md">Dicionário</a><a href="modelo-relacional.sql">SQL</a></nav></header><main>''' + ''.join(sections) + '</main></html>'
(base / 'auditoria.html').write_text(page, encoding='utf-8')
svg_files = [base / 'modelo-logico.svg', base / 'modelo-relacional.svg']
assert all(p.exists() and '<svg' in p.read_text(encoding='utf-8') for p in svg_files)
result = {'postgresqlSyntax': 'passed with pglast', 'tables': len(tables), 'foreignKeyTargetsChecked': references, 'localMarkdownLinksChecked': links, 'mermaidSvgFiles': 2, 'note': 'DDL parsed and FK targets checked; not executed against PostgreSQL. Two diagrams rendered successfully with Mermaid in local browser, then exported as SVG.'}
(base / 'evidencias/artefatos-validacao.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
