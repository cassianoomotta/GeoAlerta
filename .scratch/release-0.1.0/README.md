# Backlog publicado — GeoAlerta Core 0.1.0

Estado: divisão aprovada pelo usuário e 20 tickets publicados no Notion em 30/09/2026. Os 20 itens foram lidos novamente e conferidos quanto a título, base, status, prioridade, entrega, critérios de aceite, triagem e links dos bloqueadores. A versão 0.1.0 vem do pedido do usuário e do manifesto atual; o PRD descreve a próxima release sem versão semântica.

Destino: https://app.notion.com/p/3ebefe2e57f2801f8e0bdc682d816f2e?v=3ebefe2e57f280fda7ae000cdfd6de3b

Data source conferida: collection://3ebefe2e-57f2-804c-a0ae-000b48464034. A view retornou zero itens em 30/09/2026. Propriedades atuais: Project name, Status, Priority, Assignee, Team, Start date, End date, Attach file. Status inicial de publicação: Not started. Não atribuir responsável, equipe nem datas sem indicação do usuário. Prefixar cada título com 0.1.0 e seu número estável.

## Estratégia de validação revisada

As histórias 01–05 permanecem preservadas. Para cada história a partir de 06, separar **implementação concluída e validação básica aprovada** do **aceite integrado concluído**. A etapa básica usa verificação de tipos, lint dos arquivos alterados, testes unitários e doubles específicos quando aplicável; não exige Docker, banco/serviços Supabase locais ou novas dependências. Builds ocorrem em marcos de integração e no fechamento. A história 20 consolida o aceite integrado pendente de 06–18 e mantém rastreável a restauração específica da história 19.

O aceite integrado será feito no fechamento da release em projeto Supabase exclusivo de homologação. A suíte atual prepara banco e serviços simulados em alguns projetos; antes do uso real são necessárias adaptações das fixtures e preparação de contas, permissões e buckets. Trocar apenas a URL não basta. Nenhum teste, integração ou aceite foi executado por esta atualização documental.

A base atual não possui propriedade de triagem nem relação de bloqueio. Publicação proposta: ready-for-agent no corpo de cada ticket e links para os tickets bloqueadores na seção Blocked by, usando os campos existentes sem alterar o schema. ready-for-agent indica ticket especificado; só iniciar quando todos os bloqueadores estiverem concluídos.

## Fontes e precedência

- AGENTS.md: regras de negócio, ambiente e governança.
- docs/releases/core/requirements.md: catálogo US-01–US-07, RF-001–RF-017 e RNF-001–RNF-007.
- docs/releases/core/PRD.md: papéis, capacidades, estados e aceite.
- docs/releases/core/architecture/README.md: limites, contratos e monólito modular.
- docs/releases/core/database/README.md: baseline, Prisma Migrate, RLS e preservação.
- docs/releases/core/testing/automated-tests.md: cenários e evidência.
- docs/superpowers/plans/2026-09-29-geoalerta-core.md: referência de execução e contratos, decomposta aqui por entregas menores.

Core/ e docs/security-audit/ são referências históricas, não contratos da release. Nenhum script de auditoria ou de migration foi executado. O checkout foi consultado apenas para identificar módulos ativos, operações Supabase no navegador e ausência de Prisma/Playwright no manifesto.

## Divisão e exceções

O ticket 01 é a preparação técnica anterior às entregas: expansão aditiva e base de teste preservando o legado, sem uma refatoração destrutiva ampla. Os tickets de produto são fatias completas e verificáveis de interface, API, persistência/autorização e testes. Os tickets 19 e 20 são verificações técnicas de recuperação e aceite da release, não telas ou funcionalidades adicionais.

As dependências expressam bloqueios reais de contrato/comportamento e não a sequência linear de conveniência do plano anterior. Lista, detalhe e mapa podem começar com fixtures após acesso; abertura pública não depende de login; restauração e desativação podem começar após a base. A configuração administrativa usa capacidades fixas e não introduz um editor arbitrário de papéis/workflow.

Toda entrega de implementação deve terminar com testes relevantes e evidências sanitizadas, documentação curta das novas unidades e revisão local. Nenhum ticket autoriza IA a executar commit, push, merge ou deploy. Ambiente local: somente sistema/.env. Mudanças de banco compartilhado pertencem ao usuário.

## Tickets

1. [Preparar a base Core preservando o legado](issues/01-preparar-base-core-preservando-legado.md) — bloqueado por nenhum; High.
2. [Entrar no painel com acesso por papel e grupo](issues/02-entrar-no-painel-com-acesso-por-papel-e-grupo.md) — bloqueado por 01; High.
3. [Abrir ocorrência pública com GPS e triagem](issues/03-abrir-ocorrencia-publica-com-gps-e-triagem.md) — bloqueado por 01; High.
4. [Listar ocorrências com filtros e colunas pessoais](issues/04-listar-ocorrencias-com-filtros-e-colunas-pessoais.md) — bloqueado por 02; High.
5. [Consultar detalhe e histórico autorizados](issues/05-consultar-detalhe-e-historico-autorizados.md) — bloqueado por 02; High.
6. [Anexar e consultar foto privada](issues/06-anexar-e-consultar-foto-privada.md) — bloqueado por 03, 05; High.
7. [Registrar ocorrência manualmente no painel](issues/07-registrar-ocorrencia-manualmente-no-painel.md) — bloqueado por 03, 05; High.
8. [Editar e transicionar sem perder alterações](issues/08-editar-e-transicionar-sem-perder-alteracoes.md) — bloqueado por 05; High.
9. [Reabrir e reclassificar com justificativa](issues/09-reabrir-e-reclassificar-com-justificativa.md) — bloqueado por 08; High.
10. [Excluir e restaurar ocorrências logicamente](issues/10-excluir-e-restaurar-logicamente.md) — bloqueado por 08; High.
11. [Exportar conjunto filtrado completo em CSV](issues/11-exportar-conjunto-filtrado-completo-em-csv.md) — bloqueado por 04; High.
12. [Mostrar mapa e contagens delimitados](issues/12-mostrar-mapa-e-contagens-delimitados.md) — bloqueado por 02; High.
13. [Receber alertas in-app e recuperar reconexão](issues/13-receber-alertas-in-app-e-recuperar-reconexao.md) — bloqueado por 03, 05, 12; High.
14. [Consultar e atualizar o próprio perfil](issues/14-consultar-e-atualizar-proprio-perfil.md) — bloqueado por 02; Medium.
15. [Administrar usuários, grupos e acesso](issues/15-administrar-usuarios-grupos-e-acesso.md) — bloqueado por 02; High.
16. [Configurar transições e rótulos de status](issues/16-configurar-transicoes-e-rotulos.md) — bloqueado por 08; Medium.
17. [Administrar zonas de risco versionadas](issues/17-administrar-zonas-de-risco-versionadas.md) — bloqueado por 02, 03; High.
18. [Desativar módulos legados preservando dados](issues/18-desativar-modulos-legados-preservando-dados.md) — bloqueado por 01; High.
19. [Comprovar restauração em alvo descartável](issues/19-comprovar-restauracao-em-alvo-descartavel.md) — bloqueado por 01; High.
20. [Validar aceite integrado e capacidade da 0.1.0](issues/20-validar-aceite-integrado-e-capacidade.md) — bloqueado por 06, 07, 09, 10, 11, 13, 14, 15, 16, 17, 18, 19; High.

## Cobertura

- US-01: 03, 06.
- US-02: 02, 14.
- US-03: 12, 13.
- US-04: 04, 11.
- US-05: 05, 06, 07, 08, 09, 10.
- US-06: 15, 16, 17.
- US-07: 18.
- RF-015: auditoria distribuída nos fluxos 03, 05, 07–10, 15–17.
- RNF-001–RNF-007: distribuídos nas respectivas entregas e verificados integralmente em 20; baseline/recuperação em 01/19.

## Aprovação e publicação

A skill to-tickets exige: “Iterate until the user approves the breakdown.” O usuário aprovou a divisão e autorizou a publicação. Foi criado um item por ticket em ordem de dependência, com critérios de aceite e links reais para bloqueadores. A view passou de zero para 20 itens; a conferência individual dos 20 registros não encontrou falhas. Todos estão em Not started, com ready-for-agent no corpo. Nenhum item pai foi editado ou encerrado.

## Tickets no Notion

1. [Preparar a base Core preservando o legado](https://app.notion.com/p/3ebefe2e57f28126a1b0ff5b608b1897?pvs=204)
2. [Entrar no painel com acesso por papel e grupo](https://app.notion.com/p/3ebefe2e57f281caa852d49eafaa3602?pvs=204)
3. [Abrir ocorrência pública com GPS e triagem](https://app.notion.com/p/3ebefe2e57f281d181e0eadf4f4a0bd4?pvs=204)
4. [Listar ocorrências com filtros e colunas pessoais](https://app.notion.com/p/3ebefe2e57f281e2bf58d8394f45d65e?pvs=204)
5. [Consultar detalhe e histórico autorizados](https://app.notion.com/p/3ebefe2e57f2812eb108f82ba114ef05?pvs=204)
6. [Anexar e consultar foto privada](https://app.notion.com/p/3ebefe2e57f2814d8057fca83c7d6ad1?pvs=204)
7. [Registrar ocorrência manualmente no painel](https://app.notion.com/p/3ebefe2e57f281f0b249d33ef95762b7?pvs=204)
8. [Editar e transicionar sem perder alterações](https://app.notion.com/p/3ebefe2e57f281188fcfe865c96f11c4?pvs=204)
9. [Reabrir e reclassificar com justificativa](https://app.notion.com/p/3ebefe2e57f28197b7bfd4564df64ba8?pvs=204)
10. [Excluir e restaurar ocorrências logicamente](https://app.notion.com/p/3ebefe2e57f281e9ac27da527de50b9a?pvs=204)
11. [Exportar conjunto filtrado completo em CSV](https://app.notion.com/p/3ebefe2e57f28136afd5c07467c4600f?pvs=204)
12. [Mostrar mapa e contagens delimitados](https://app.notion.com/p/3ebefe2e57f281c98438df148385859d?pvs=204)
13. [Receber alertas in-app e recuperar reconexão](https://app.notion.com/p/3ebefe2e57f28163a16af648ea8b01a3?pvs=204)
14. [Consultar e atualizar o próprio perfil](https://app.notion.com/p/3ebefe2e57f281af9165d744c51c2867?pvs=204)
15. [Administrar usuários, grupos e acesso](https://app.notion.com/p/3ebefe2e57f28184812fc6353fc8b3e4?pvs=204)
16. [Configurar transições e rótulos de status](https://app.notion.com/p/3ebefe2e57f28106a3d8c5d2c8516e82?pvs=204)
17. [Administrar zonas de risco versionadas](https://app.notion.com/p/3ebefe2e57f281b38bb6efaa365e3059?pvs=204)
18. [Desativar módulos legados preservando dados](https://app.notion.com/p/3ebefe2e57f281ada21aed98d1e190d4?pvs=204)
19. [Comprovar restauração em alvo descartável](https://app.notion.com/p/3ebefe2e57f2815e969be14645e8f194?pvs=204)
20. [Validar aceite integrado e capacidade da 0.1.0](https://app.notion.com/p/3ebefe2e57f281bfbbecff444bd7e6e0?pvs=204)
