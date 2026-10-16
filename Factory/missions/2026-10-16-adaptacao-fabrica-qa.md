# QA independente — adaptação da fábrica

Data: 2026-10-16 (America/Sao_Paulo). Revisor: agente QA `qa_factory`, diferente dos implementadores coordenador e `ledger_local`. A revisão não alterou implementação; escreveu somente este relatório.

## Parecer técnico

Aprovado para integração das evidências e atualização para `awaiting_review`. Nenhum achado impeditivo identificado no escopo revisado. Não representa aceite humano da entrega nem autoriza `completed`, commit, push, merge ou deploy. No momento da execução, missão e ledger estavam coerentemente em `in_progress`, aguardando QA; cabe ao coordenador registrar a prontidão com referência a esta evidência.

## Escopo e critérios

Revisados `git diff` de AGENTS.md, README.md, docs/README.md e .gitignore; inventário e conteúdo de Factory, .codex e .github. Os diretórios importados estão não rastreados no Git, portanto sua revisão foi por leitura dos arquivos atuais, não por diff histórico de importação. Não implementei os arquivos avaliados.

1. Governança: AGENTS.md preserva integralmente o conteúdo preexistente, desconsiderando espaço terminal, e acrescenta a seção da fábrica. Políticas e quatro papéis convergem em supervisão por entrega, seleção de especialistas conforme necessidade, QA independente e publicação exclusivamente humana. Nenhuma política ativa exige issue, PR ou merge.
2. Contexto: fontes do GeoAlerta verificadas localmente; regras de geolocalização, áreas de risco, prioridade, alertas in-app, painel e CSV preservadas. Decisões ativas registram as respostas desta conversa. Material GovClima6D fica em Factory/archive/govclima6d com aviso explícito de inatividade; ledger operacional contém somente a missão GeoAlerta v2. Nenhuma URL, caminho ou ID de evidência do projeto de origem foi encontrado nos arquivos ativos pela busca descrita abaixo.
3. Contrato local: casos positivos da CLI aceitam awaiting_review e completed sem issue/PR; casos negativos recusam estados antigos, gates ausentes/falsos e evidências fora do formato local.
4. Prontidão e aceite: schema, testes e políticas exigem testes e QA independente aprovados para prontidão; completed exige declaração de aceite humano e referência local. Aprovação do plano não é aceite final.
5. Formatos e referências: JSON/TOML analisados; links locais e fontes explícitas conferidos; testes e ledger aprovados. Workflow GitHub lido: somente checkout, Python, instalação das dependências da fábrica, testes e validação; sem publicação ou deploy. Templates opcionais coerentes com a política.
6. Preservação: diff rastreado não modifica aplicação, dependências da aplicação ou banco. Arquivos preexistentes em docs/ideas e docs/meetings permanecem fora do escopo. Não foi lido nem alterado arquivo pessoal de configuração ou .env.

## Comandos e resultados executados

- `PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python -m unittest discover -s Factory/tests -v` — saída `Ran 21 tests`, `OK`, código 0. Inclui gates de testes/QA/aceite, referências locais, campos extras, datas e fusos, cronologia, JSON/UTF-8 inválido, arquivo ausente, ledger vazio, métricas desconhecidas, TOML, fixtures textuais e contrato de telemetria.
- `PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python Factory/ledger/validate.py` — `Ledger valid`, código 0, arquivo operacional v2.
- `git diff -- AGENTS.md README.md docs/README.md .gitignore` e `git status --short` — inspeção realizada; AGENTS original preservado e acréscimos circunscritos à fábrica.
- `rg --files --hidden Factory .codex .github` e leitura com `cat` dos arquivos de políticas, memória, configuração, schema, CLI, testes, evals, métricas, telemetria, templates e bootstrap — executados para revisão de conteúdo e fronteiras de autoridade.
- Verificação Python ad hoc, sem escrita: `json.loads` para todos os `Factory/**/*.json` (6); `tomllib.loads` para todos os `.codex/**/*.toml` (6); extração dos links Markdown locais fora do archive (11, nenhum ausente); existência de 12 fontes/caminhos explícitos do contexto; comparação `git show HEAD:AGENTS.md` com prefixo atual; busca ativa por URLs GovClima6D, `Documentos/Especificação`, `issue-6-factory-basics` e `/Users/` — todos aprovados, código 0. A busca excluiu archive e caches; nomes históricos usados para explicar a migração não constituem contexto operacional herdado.
- `bash -n Factory/setup/install-skills.sh` — código 0; somente sintaxe, bootstrap não executado.
- `git diff --check` — código 0.

Testes executados: 21 aprovados. Testes falhos: nenhum. Verificações requeridas bloqueadas: nenhuma.

## Cenários textuais — leitura crítica

Não houve simulação nem avaliação de comportamento de um modelo. Os três casos JSON foram confrontados com instruções e contratos:

- `delegation-and-learning-v2`: tarefa pequena pode ser executada pelo coordenador; QA deve ser independente; retrabalho fica local; alteração futura de governança pede autorização específica. Evidência: delegation.md, quality.md e continuous-improvement.md. Invariantes coerentes; nenhum resultado proibido instruído.
- `local-delivery-human-acceptance-v2`: entrega local sem issue/PR pode atingir awaiting_review; completed depende do aceite do resultado; publicação permanece humana. Evidência: quality.md, issues-and-pull-requests.md, schema e testes positivos/negativos. Invariantes atendidos no contrato.
- `mission-quality-gates-v2`: teste requerido falho ou QA ausente impedem prontidão; correção seguida de nova validação; rubrica não compensa gates pendentes. Evidência: quality.md, delegation.md, rubric.md e testes negativos. Invariantes atendidos nas instruções e no contrato.

## Limitações

- A CLI verifica formato e cronologia dos marcos de cada registro. Não prova existência, conteúdo ou autenticidade de evidência, identidade/independência do revisor, veracidade do aceite humano nem imutabilidade ou sequência entre linhas do histórico. Append-only é convenção documentada, não garantia criptográfica. QA e usuário continuam responsáveis pela conferência material.
- TOML válido e papéis presentes não provam que uma nova sessão do Codex carregará a configuração nem exercitam cada papel. Não foi realizada missão piloto de produto. O runtime já forneceu o papel QA nesta sessão; isso não é teste integral das configurações.
- CI foi inspecionada, não executada remotamente; YAML foi conferido por leitura. Não afirmo check GitHub aprovado, workflow habilitado ou branch protection configurada.
- Não foi executado bootstrap, instalação de skills, ativação de MCP, coleta externa ou publicação. Supabase e demais serviços são apenas catálogo desativado; não houve acesso a banco ou serviços.
- Build, lint e testes da aplicação/banco não foram executados: nenhuma funcionalidade de produto integra esta adaptação. Configuração pessoal não foi inspecionada; preservação atestada apenas quanto às ações desta revisão e ao diff local da entrega.
- O archive foi conferido quanto à separação e inatividade, mas não existe baseline Git rastreada desses arquivos importados para provar identidade byte a byte com a origem.

## Skills

Consultado Factory/setup/skills.md e confirmado o catálogo próprio. Lida e aplicada `superpowers:verification-before-completion`, em `/Users/hcosta/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/verification-before-completion/SKILL.md`, para exigir execução fresca antes das conclusões. Nenhuma skill instalada ou dependência externa acionada por esta revisão.

## Revalidação da integração final

Após o coordenador registrar a prontidão, executei novamente `PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python Factory/ledger/validate.py`: aprovado, código 0. Verificação Python ad hoc confirmou duas linhas (histórico inicial in_progress e atualização awaiting_review), DoD e quatro gates true, existência das referências de testes/QA, missão textual awaiting_review, completed_at null e ausência de aceite humano alegado. Integração coerente; parecer técnico mantido. Esta confirmação não altera o ledger nem concede aceite final.
