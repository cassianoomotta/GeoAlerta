# Evals da factory

Os evals verificam regressões no processo e nas instruções dos agentes. Esta primeira suite é deliberadamente pequena, local e determinística: os casos descrevem cenários e invariantes esperados; os testes estruturais do repositório validam os gates que podem ser verificados sem chamar um modelo. Aqui, “evals” significa avaliação reproduzível da factory, sem dependência de uma plataforma de fornecedor.

## Quando rodar

- Em toda alteração de `AGENTS.md`, `.codex/agents/`, `Factory/policies/`, templates de issue/PR ou definições de qualidade.
- Antes/depois de uma mudança de prompt ou processo, comparando casos aprovados, falhos e regressões.
- Nos testes regulares de mudança da própria factory: `python3 -m unittest discover -s Factory/tests -v`, após instalar `Factory/requirements-dev.txt` em um ambiente Python 3.11+.

Não trate um eval textual como substituto de testes do produto, QA, revisão humana, DoD ou aceite humano explícito. Casos devem ser sanitizados e cobrir falhas reais recorrentes; toda nova regra deve ser sustentada por evidência e uma expectativa verificável. Evite sobreajustar instruções a casos sintéticos isolados.

A primeira linha de base operacional deve ser descritiva, sem metas de desempenho: acumule resultados de um pequeno lote inicial de missões concluídas (por exemplo, dez), verifique se as categorias são úteis e só então avalie tendências. Não misture o resultado de uma suite determinística versionada com avaliações qualitativas de respostas do modelo.

Os casos JSON são fixtures de avaliação, não exemplos de projetos específicos. Para comparações de comportamento do modelo, registre modelo/configuração, versão do caso e critérios de graduação; não salve prompts reais nem respostas contendo dados sensíveis.

A suíte também valida registros sintéticos do ledger contra JSON Schema e regras de cronologia; o comando `python3 Factory/ledger/validate.py` valida o arquivo operacional. O workflow de CI executa ambos. Esses testes exercitam contratos de dados, sem executar uma missão piloto nem comprovar o comportamento real dos agentes.
