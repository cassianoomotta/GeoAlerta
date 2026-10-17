# Ledger local de missões do GeoAlerta

O ledger é o índice mínimo dos ciclos de **alteração** do GeoAlerta. A demanda, os critérios de aceite, as decisões e as evidências ficam no registro local `Factory/missions/<id>.md`; `mission_ref` aponta para esse registro. Consultas sem alteração podem ter somente resultado registrado na missão, sem entrada no ledger ou convocação de equipe. Issues e PRs não são pré-requisitos.

Registre uma linha JSON por atualização relevante em `cycles.jsonl`, seguindo `schema.json` versão 2. Use `entry.template.json`, substitua `MISSION_ID` e `updated_at` e mantenha informações desconhecidas como `null`. O histórico importado da versão 1 deve ser arquivado separadamente, sem tratá-lo como entregas do GeoAlerta ou converter suas métricas em dados locais.

## Estados e evidências

| Estado | Condição |
| --- | --- |
| `in_progress` | Alteração em execução; marcos desconhecidos podem ser `null`. |
| `blocked` | Bloqueio documentado na missão; não representa entrega concluída. |
| `awaiting_review` | Critérios atendidos (`definition_of_done`), testes definidos e aprovados, QA independente aprovado, referências locais das duas evidências e data de prontidão. A entrega aguarda revisão humana. |
| `completed` | Mesmos gates, aceite humano explícito com evidência local e `completed_at`. |

`quality_gate.tests_defined`, `tests_passed`, `qa_independent` e `qa_passed` precisam ser `true` para prontidão ou conclusão. `quality_gate.evidence_ref` aponta para os comandos/resultados de testes e `qa_evidence_ref` para a revisão realizada por alguém diferente do implementador. O coordenador seleciona os especialistas conforme a demanda; alterações sempre recebem QA independente.

Somente `completed` admite `human_review.approved_by_human: true` e `completed_at`. O aceite deve se referir à entrega final: aprovação inicial do desenho ou autorização para trabalhar não constitui aceite da implementação. A evidência deve registrar a decisão humana real, sem inventar uma aprovação. Enquanto isso, use `awaiting_review` com `human_review.approved_by_human` igual a `false` ou `null`.

Referências de missão têm o formato `Factory/missions/<id>.md`. Evidências usam caminhos relativos iniciados em `Factory/`, opcionalmente com âncora, por exemplo `Factory/missions/minha-missao.md#testes` ou `Factory/missions/minha-missao-qa.md`. URLs externas, caminhos absolutos e travessias `../` são recusados. O validador verifica o formato; QA e humano conferem a existência e o conteúdo das evidências. Aprovação registrada não autoriza a IA a executar commit, push, merge ou deploy: essas ações pertencem exclusivamente ao usuário.

## Datas e métricas

Use timestamps RFC3339 com fuso horário. A CLI compara instantes e exige a ordem dos marcos conhecidos: `started_at <= ready_for_review_at <= completed_at <= updated_at`. Para prontidão e conclusão, `started_at` e `ready_for_review_at` são obrigatórios. Preserve a primeira prontidão em caso de retrabalho. Não invente datas ausentes.

Retrabalho, rubrica, evals, duração, tokens, custos, fontes e referências adicionais são opcionais. Campos disponíveis no modelo podem ficar `null` quando não há fonte confiável. Não use zero para representar medição desconhecida. O ledger não deve avaliar agentes individualmente.

## Validação

Requer Python 3.11 ou superior e as dependências de `Factory/requirements-dev.txt`, preferencialmente em ambiente virtual:

```sh
python3 -m pip install -r Factory/requirements-dev.txt
python3 -m unittest discover -s Factory/tests -v
python3 Factory/ledger/validate.py
python3 Factory/ledger/validate.py /caminho/para/cycles.jsonl
```

A CLI aplica JSON Schema Draft 2020-12, verifica formatos e cronologia e reporta arquivo, linha e campo/regra inválida. JSON inválido e falhas de leitura retornam código diferente de zero. Ledger vazio é válido; linhas em branco são inválidas. Campos extras e os estados antigos `awaiting_merge` e `awaiting_closure` são recusados.

A validação é local: não consulta serviços externos e não prova que testes, QA ou aceite ocorreram. As evidências devem permitir conferência independente. Registre resultados reais, inclusive falhas e limitações. Não copie prompts, conversas integrais, diffs, segredos, dados pessoais ou traces. O ledger é append-only por convenção: corrija com nova atualização auditável e justifique a correção na missão.
