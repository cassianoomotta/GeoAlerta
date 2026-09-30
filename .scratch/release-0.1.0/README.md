# Backlog proposto — GeoAlerta Core 0.1.0

Estado: divisão preparada em 30/09/2026 para aprovação, ainda não publicada no Notion. A versão 0.1.0 vem do pedido do usuário e do manifesto atual; o PRD descreve a próxima release sem versão semântica.

Destino: https://app.notion.com/p/3ebefe2e57f2801f8e0bdc682d816f2e?v=3ebefe2e57f280fda7ae000cdfd6de3b

Data source conferida: collection://3ebefe2e-57f2-804c-a0ae-000b48464034. A view retornou zero itens em 30/09/2026. Propriedades atuais: Project name, Status, Priority, Assignee, Team, Start date, End date, Attach file. Status inicial de publicação: Not started. Não atribuir responsável, equipe nem datas sem indicação do usuário. Prefixar cada título com 0.1.0 e seu número estável.

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

## Revisão da divisão antes de publicar

A skill to-tickets exige: “Iterate until the user approves the breakdown.” A aprovação deve confirmar granularidade, dependências e eventuais tickets a unir ou dividir. Após aprovação, publicar um item por ticket em ordem de dependência, com critérios de aceite e links reais para bloqueadores, e conferir propriedades/conteúdo salvo. Não editar nem encerrar um item pai.

