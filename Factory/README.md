# Fábrica de software do GeoAlerta

Você apresenta uma demanda e recebe uma entrega local verificável. O coordenador conduz o trabalho, escolhe os especialistas necessários e solicita decisões apenas quando afetam o resultado. QA valida toda alteração de forma independente. O usuário revisa o resultado e controla exclusivamente commits, pushes, merges e deploys.

## Fluxo de uma demanda

1. Registre objetivo, escopo e critérios de aceite em `missions/<data>-<descricao>.md`, usando `missions/TEMPLATE.md`. Para uma consulta simples, use um registro conciso; não é necessário plano extenso nem convocar toda a equipe.
2. Consulte o contexto vigente em `memory/shared/` e as fontes do produto. Defina as verificações proporcionais ao risco antes de implementar.
3. Acione PO, Analyst e Developer conforme a necessidade. O coordenador pode executar diretamente tarefas pequenas. Preserve alterações existentes.
4. Implemente e teste localmente. QA revisa independentemente cada alteração e registra comandos, resultados e limitações.
5. Registre `awaiting_review` no ledger quando os critérios e gates passarem. Entregue ao usuário resumo, arquivos e evidências. Sem issue, PR, commit ou publicação obrigatórios.
6. Registre `completed` somente depois de o usuário aceitar explicitamente o resultado. Retrabalho retorna a `in_progress` sem apagar o histórico. Aceite não autoriza publicação pela IA.

## Mapa

- `policies/`: delegação, qualidade, operação local, melhoria e agentes permanentes.
- `missions/`: demandas e evidências; fonte de acompanhamento local.
- `ledger/`: índice estruturado de estados e métricas, contrato v2 e validador.
- `memory/shared/`: contexto, arquitetura e decisões específicas do GeoAlerta.
- `evals/`: cenários de avaliação das instruções e rubrica qualitativa.
- `tests/`: testes dos contratos locais e da configuração.
- `setup/skills.md`: descoberta de skills; bootstrap é opcional e não foi executado nesta adaptação.
- `telemetry/`: proposta inativa; sem coleta externa habilitada pela fábrica.
- `archive/`: material herdado, sem autoridade ou valor de evidência operacional local.
- `../.codex/agents/`: PO, Analyst, Developer e QA. O coordenador é o agente principal.
- `../.github/`: templates opcionais para publicação humana e CI de validação sem deploy.

As regras de negócio e governança de `../AGENTS.md` prevalecem. Não copiar decisões do projeto de origem. O contexto documentado não comprova funcionamento nem estado de produção.

## Verificação local

Python 3.11 ou superior. Na raiz do repositório:

```bash
python3 -m venv /tmp/geoalerta-factory-venv
/tmp/geoalerta-factory-venv/bin/python -m pip install -r Factory/requirements-dev.txt
PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python -m unittest discover -s Factory/tests -v
PYTHONDONTWRITEBYTECODE=1 /tmp/geoalerta-factory-venv/bin/python Factory/ledger/validate.py
```

Não há alteração de dependências da aplicação. A CI versionada executará as verificações depois de publicação humana; isso não afirma que ela esteja ativa, obrigatória ou já aprovada no GitHub. Não realiza deploy.
