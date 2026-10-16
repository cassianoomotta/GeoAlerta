# Registro de decisões

Registre decisões duráveis que afetam produto, arquitetura ou operação. Explique contexto, decisão, justificativa, data e status. Evite registrar hipóteses como decisões.

## Decisões

### DEC-001 — Implantação gradual da factory
- **Data:** 2026-10-16
- **Status:** aceita
- **Contexto:** a factory deve poder ser generalizada para outros projetos, mas precisa funcionar primeiro neste repositório.
- **Decisão:** estruturar agora o GovClima6D e manter contexto de projeto separado das políticas reutilizáveis, para que uma fase posterior possa generalizar o núcleo.
- **Consequências:** `Factory/memory/shared/project.md` contém contexto local; políticas de processo devem evitar pressupostos de domínio.
- **Fonte/aprovação:** decisão do responsável pelo repositório nesta conversa.

### DEC-002 — Publicação supervisionada no GitHub
- **Data:** 2026-10-16
- **Status:** aceita
- **Contexto:** os agentes precisam conduzir demandas até um PR com regras claras de autoridade.
- **Decisão:** agentes podem criar issues e PRs quando os critérios da política forem cumpridos; humanos aprovam PRs e fazem merges. Deploy em produção requer autorização humana explícita.
- **Consequências:** a política e os templates definem os dados e as evidências exigidos antes da publicação.
- **Fonte/aprovação:** decisão do responsável pelo repositório nesta conversa.

### DEC-003 — Issue obrigatória e verificação automatizada
- **Data:** 2026-10-16
- **Status:** aceita
- **Contexto:** a avaliação da factory identificou exceção para pequenos ajustes, verificações apenas estruturais e ausência de estados de espera no ledger.
- **Decisão:** toda mudança exige issue; automatizar testes e validação do ledger; adicionar estados de espera e marcos verificáveis. Não executar a missão piloto nesta etapa.
- **Consequências:** harmonizar políticas e templates, validar registros e medir prontidão, merge e conclusão separadamente. A consolidação prévia do repositório permanece a cargo do responsável.
- **Fonte/aprovação:** instrução explícita do responsável nesta conversa em 2026-10-16, itens 1 a 5 da resposta à avaliação.

## Modelo

### DEC-000 — Título
- **Data:** AAAA-MM-DD
- **Status:** proposta | aceita | substituída
- **Contexto:** problema ou restrição
- **Decisão:** escolha tomada
- **Consequências:** impactos e compromissos
- **Fonte/aprovação:** referência à issue, PR ou responsável humano
