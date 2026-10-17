# Adaptação da fábrica para o GeoAlerta

- ID: 2026-10-16-adaptacao-fabrica
- Estado: awaiting_review
- Origem: solicitação e entrevista nesta conversa em 2026-10-16; desenho aprovado pela resposta `aprovado`.

## Objetivo e escopo

Adaptar a estrutura trazida do GovClima6D para evoluir o GeoAlerta com supervisão por entrega e acompanhamento local. Especialistas conforme a necessidade; QA independente em toda alteração. Preservar regras de negócio, `.env` único e proibição de commits, pushes, merges e deploys pela IA.

Inclui instruções, políticas, memórias, papéis, templates, ledger v2 e testes da fábrica. Não altera funcionalidades da aplicação, banco, ambiente pessoal, serviços externos nem instala skills.

## Critérios de aceite e verificação

1. Instruções vigentes coerentes com as decisões aprovadas e regras estritas do GeoAlerta: revisão independente de QA.
2. Contexto local usa fontes existentes; material de origem fica arquivado e inativo: inspeção de caminhos e referências.
3. Acompanhamento não exige issue, PR ou merge: testes do contrato v2 com registros exclusivamente locais.
4. Prontidão exige testes e QA independente; conclusão exige aceite humano do resultado: testes positivos e negativos da CLI.
5. Configurações, JSON e ledger válidos; testes da fábrica aprovados: comandos documentados em Factory/README.md.
6. Entrega revisável e preservação de trabalho existente: inspeção de diff e estado local. Sem comandos de publicação.

## Execução e decisões

Coordenador adapta documentação e configurações; Developer cuida do contrato e testes do ledger; QA revisa de forma independente o conjunto. Decisões em `Factory/memory/shared/decisions.md`.

Arquivados sem alteração os registros v1, contexto e decisões importadas em `Factory/archive/govclima6d/`. O antigo `AGENTS copy.md` foi preservado como `AGENTS.imported.md`; as regras aplicáveis foram consolidadas no `AGENTS.md` original, preservando as seções preexistentes.

## Evidências

### Testes

- `PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python -m unittest discover -s Factory/tests -v`: 21 testes aprovados em 8,129 s. Inclui 17 testes comportamentais da CLI e 4 de artefatos consumíveis (TOML, template, cenários e contrato de telemetria).
- `PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python Factory/ledger/validate.py`: aprovado para o registro inicial local v2.
- `bash -n Factory/setup/install-skills.sh`: sintaxe aprovada; instalador não executado.
- `git diff --check`: aprovado para arquivos rastreados; a estrutura importada continua não rastreada, portanto esse comando sozinho não cobre esses arquivos.
- Inspeção Python de todos os JSON/JSONL da fábrica e links dos índices: formatos válidos e caminhos existentes.
- Comparação com `git show HEAD:AGENTS.md`: todas as regras originais preservadas antes da nova seção 6.

O Developer confirmou RED antes da adaptação do contrato (registro local recusado pelo schema herdado). A primeira execução completa teve três falhas em asserts textuais legadas que exigiam CEO literal, PR/issue e versão 1; esses testes foram substituídos por verificações dos artefatos consumidos, mantendo os testes comportamentais dos gates. A suíte final acima passou.

Dependências Python foram instaladas somente no ambiente temporário `/tmp/geoalerta-factory-venv`. O acesso de rede inicial no sandbox falhou; instalação terminou após escalada autorizada. Escrita em `.codex/` também exigiu escalada, concluída. Nenhuma configuração pessoal foi alterada.

### Configuração do Codex

A forma de arquivos por papel e as opções importadas foram conferidas na [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents) e na [referência de configuração](https://learn.chatgpt.com/docs/config-file/config-reference). A validação TOML local não prova recarregamento de papéis em uma sessão já aberta. A tentativa `codex --strict-config features list` foi recusada por essa combinação de comando/opção não ser suportada; não é evidência de configuração inválida ou de carregamento bem-sucedido.

### Limites

Build, testes da aplicação e testes de banco não foram executados: esta demanda altera somente a fábrica e documentos de entrada. CI remota e comportamento de agentes em futuras sessões não foram exercitados; cenários textuais orientam revisão e não equivalem a avaliações automatizadas do modelo. A CLI valida formato e cronologia, não a autenticidade das evidências.

QA independente: `Factory/missions/2026-10-16-adaptacao-fabrica-qa.md` (resultado registrado pelo validador, sem participação na implementação).

## Entrega e aceite

Aprovação do desenho autoriza esta adaptação, mas não representa aceite antecipado do resultado. QA independente aprovado e 21 testes da fábrica aprovados; entrega pronta para revisão humana. Aceite final ainda não recebido. Sem publicação no GitHub ou deploy.
