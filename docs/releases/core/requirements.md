# Histórias e requisitos — GeoAlerta Core

**Estado:** planejamento para revisão em 29/09/2026; funcionalidades ainda não implementadas por estes documentos.

Este arquivo substitui `requirements.txt` como catálogo de produto em Markdown. Os IDs `US`, `RF` e `RNF` foram preservados. O [PRD](PRD.md) define escopo, papéis e ciclos de vida; o [plano de testes](testing/automated-tests.md) liga os requisitos aos cenários automatizados.

## US-01 — Abertura pública

**Como** cidadão, **quero** registrar uma ocorrência com minha localização atual e evidência opcional, **para** pedir atendimento sem criar conta.

**Rota:** `/`. **Requisitos:** `RF-001`, `RF-002`, `RF-003`, `RF-004`.

| ID | Requisito |
|---|---|
| RF-001 | Cidadão abre ocorrência sem login e recebe protocolo. |
| RF-002 | Registro público exige geolocalização nativa válida; armazena latitude, longitude e precisão informada pelo dispositivo. |
| RF-003 | Registro verifica interseção com zonas de risco ativas e persiste prioridade `ALTA` quando houver sobreposição. |
| RF-004 | Foto de evidência é opcional e acessível somente a usuários autorizados. |

**Critérios de aceite:**

- Dado GPS válido e os campos obrigatórios, quando envio, então recebo protocolo único somente após a persistência confirmada, com status inicial `NOVA` e grupo operacional padrão do município.
- Dada ausência de localização, permissão negada, indisponibilidade, timeout ou coordenadas inválidas, quando envio, então o registro é bloqueado com orientação para tentar novamente.
- Dado ponto que intersecta zona ativa, quando persisto, então a prioridade é `ALTA` e a classificação registra as zonas e versões consideradas; sem zona ativa correspondente, é `NORMAL`.
- Dada repetição da mesma tentativa com a mesma chave de idempotência, quando reenvio, então recebo o mesmo protocolo sem duplicação.
- Dada foto opcional, quando envio, então seu acesso permanece privado; falha no upload exige mensagem clara e opção de tentar novamente ou confirmar envio sem foto.

## US-02 — Login e perfil

**Como** integrante do backoffice, **quero** entrar com minha conta e atualizar meus dados permitidos, **para** trabalhar com identificação individual.

**Rotas:** `/login`, `/painel/perfil`. **Requisitos:** `RF-005`, `RF-006`.

| ID | Requisito |
|---|---|
| RF-005 | Operador acessa backoffice com login; não há cadastro público de operadores. |
| RF-006 | Usuário autenticado consulta e atualiza os próprios dados de perfil permitidos. |

**Critérios de aceite:**

- Dada conta `ATIVO`, quando as credenciais são válidas, então o painel aplica o papel e os grupos atribuídos.
- Dada conta `PENDENTE`, `SUSPENSO` ou `DESATIVADO`, quando tenta uma operação protegida, então API e banco negam acesso, inclusive com sessão anterior.
- Dado meu perfil, quando altero nome, telefone ou preferências, então somente minha conta muda; e-mail institucional, papel, grupos e estado não são alteráveis por esse fluxo.

## US-03 — Dashboard

**Como** operador, **quero** ver mapa, contagens e novas ocorrências no meu escopo, **para** priorizar o atendimento.

**Rota:** `/painel`. **Requisito:** `RF-007`.

| ID | Requisito |
|---|---|
| RF-007 | Dashboard mostra mapa, contagens por status/prioridade e alertas in-app para ocorrências novas. |

**Critérios de aceite:**

- Dada ocorrência autorizada já persistida, quando o painel está aberto, então recebo alerta visual in-app e posso abrir seu detalhe.
- Dada reconexão, quando o canal retorna, então o painel busca o estado corrente para recuperar eventos perdidos sem duplicar alertas.
- Dado histórico extenso, quando abro o mapa, então recebo recorte espacial/temporal limitado; contagens respeitam o mesmo escopo autorizado.
- Dado evento de outro grupo, quando chega pelo canal, então nenhum dado desse evento é entregue a um usuário sem acesso.

## US-04 — Lista operacional e exportação

**Como** operador, **quero** filtrar, ordenar e configurar colunas da lista, **para** localizar o trabalho relevante; **como** gestor ou administrador, **quero** exportar a visão autorizada completa em CSV.

**Rota:** `/painel/ocorrencias`. **Requisitos:** `RF-008`, `RF-009`, `RF-016`.

| ID | Requisito |
|---|---|
| RF-008 | Menu lateral aplica filtros rápidos por status à lista de ocorrências. |
| RF-009 | Lista pagina, filtra e ordena no servidor e permite escolher colunas visíveis por usuário. |
| RF-016 | Gestor ou administrador exporta CSV local do conjunto filtrado completo. |

**Critérios de aceite:**

- Dado atalho de status, quando seleciono, então o filtro aparece na URL e os resultados são paginados no servidor.
- Dados filtros de período, status, prioridade, tipo e grupo autorizado, quando ordeno ou troco de página, então os critérios permanecem na URL.
- Dada preferência de colunas, quando retorno à lista, então minha escolha é restaurada sem modificar a preferência de outra conta.
- Dado gestor ou administrador, quando exporta, então o CSV inclui todo o conjunto filtrado autorizado, além da página visível, com tratamento de fórmulas, aspas, separadores e quebras de linha.
- Dado Consulta ou Operador, quando tenta exportar pela API, então o acesso é negado.

## US-05 — Detalhe e ciclo de vida

**Como** operador, **quero** ler, criar e atualizar ocorrências conforme minhas permissões, **para** acompanhar o atendimento; **como** administrador, **quero** excluir e restaurar logicamente com justificativa.

**Rotas:** `/painel/ocorrencias`, `/painel/ocorrencias/[id]`. **Requisitos:** `RF-010`, `RF-011`, `RF-012`, `RF-015`.

| ID | Requisito |
|---|---|
| RF-010 | Usuário autorizado visualiza detalhe e dados do cidadão segundo seu papel e grupo. |
| RF-011 | Usuário autorizado cria, edita e altera o status de ocorrências conforme regras de transição. |
| RF-012 | Exclusão de ocorrência é lógica, justificada, auditada e restrita ao administrador. |
| RF-015 | Mudanças em ocorrência, acesso e configuração geram trilha de auditoria. |

**Critérios de aceite:**

- Dado papel e grupo permitidos, quando consulto detalhe, então vejo campos e histórico autorizados; Consulta não recebe nome, contato nem foto, inclusive na resposta da API e no banco.
- Dada criação manual, quando um operador autorizado registra, então a localização nativa continua obrigatória, a triagem espacial é aplicada e o evento identifica o operador.
- Dada edição ou transição, quando salvo com versão atual, então ocorrência e auditoria mudam atomicamente; versão desatualizada retorna conflito sem sobrescrever a atualização anterior.
- Dada transição proibida ou registro excluído, quando tento alterar status, então não há alteração parcial.
- Dado Gestor ou Administrador, quando reclassifico prioridade ou reabro `RESOLVIDA`/`CANCELADA`, então uma justificativa é obrigatória e auditada.
- Dado Administrador, quando excluo/restauro com motivo, então o registro continua recuperável e a ação aparece na auditoria.

**Estados e transições:** códigos, rótulos e regras iniciais são os definidos na [seção 6 do PRD](PRD.md#6-ciclos-de-vida).

## US-06 — Administração

**Como** administrador, **quero** gerenciar usuários, grupos, papéis, transições e zonas, **para** manter o acesso e o fluxo operacional sob controle.

**Rota:** `/painel/admin`. **Requisitos:** `RF-013`, `RF-014`, `RF-015`.

| ID | Requisito |
|---|---|
| RF-013 | Administrador gerencia usuários, grupos, papéis e estados do ciclo de vida do acesso. |
| RF-014 | Administrador gerencia regras permitidas de transição de status e zonas de risco ativas. |
| RF-015 | Mudanças em ocorrência, acesso e configuração geram trilha de auditoria. |

**Critérios de aceite:**

- Dado cadastro administrativo, quando atribuo papel e grupos, então o acesso efetivo combina ambos; não existe autocadastro de operadores.
- Dada suspensão ou desativação, quando a conta tenta nova ação, então API, RLS e Realtime aplicam a mudança, inclusive para sessões anteriores.
- Dada alteração de transição, quando salvo, então a regra vale para operações seguintes sem reescrever eventos passados; códigos internos dos estados não são editáveis nem apagáveis.
- Dada zona desativada ou fora da vigência, quando uma nova ocorrência intersecta seu polígono, então ela não eleva a prioridade; registros anteriores mantêm explicação da classificação original.
- Dada atribuição de grupo padrão, quando uma ocorrência pública é aberta, então ela entra no grupo configurado; reatribuição posterior exige autorização e auditoria.

## US-07 — Desativação preservando legado

**Como** gestor do produto, **quero** retirar os módulos adicionais da release, **para** concentrar operação e manutenção nas ocorrências.

**Rotas desativadas:** `/painel/recursos`, `/painel/abrigos`, `/painel/equipes`, `/painel/voluntarios`, `/rastreio`. **Requisito:** `RF-017`.

| ID | Requisito |
|---|---|
| RF-017 | Recursos, abrigos, equipes/GPS e voluntários ficam inacessíveis na release, com código e dados preservados. |

**Critérios de aceite:**

- Dada release Core ativa, quando abro menu, rota direta ou operação desses módulos, então não consigo operá-los.
- Dada desativação, quando uso a aplicação, então não são iniciadas assinaturas nem transmissão GPS dos módulos inativos.
- Dada migration Core, quando comparo o legado antes e depois, então código, tabelas, registros e arquivos desses módulos permanecem preservados.

## Requisitos não funcionais e decisões transversais

| ID | Requisito | Verificação planejada |
|---|---|---|
| RNF-001 | Autorização é aplicada em API e banco; interface não é barreira de segurança. | Matriz positiva/negativa por papel, grupo e estado; RLS e Storage reais. |
| RNF-002 | Entrada pública tem validação, limitação de abuso e idempotência. | Coordenadas inválidas, campos manipulados, rajadas e reenvios concorrentes. |
| RNF-003 | Consultas de lista e mapa são delimitadas; nenhuma tela carrega o histórico inteiro por padrão. | Paginação e limites espaciais/temporais com pelo menos 50 mil registros. |
| RNF-004 | Capacidade planejada: 100 novas ocorrências/hora em crise, 10 sessões simultâneas de backoffice e histórico de ao menos 50 mil ocorrências. | Uma hora de carga, rajadas de 10 envios/minuto, p95 de registro sem foto/lista até 3 s e alerta até 5 s; metas ainda não comprovadas. |
| RNF-005 | Fluxos críticos têm cenários automatizados e testes de permissão, concorrência e migração. | Validação básica unitária por história; aceite integrado de API/interface e serviços reais no Supabase de homologação ao fechamento, conforme [plano de testes](testing/automated-tests.md). |
| RNF-006 | Alertas operacionais são in-app; não há integração bidirecional com planilhas externas. | Alertas no painel e download CSV local. |
| RNF-007 | Alterações de banco são versionadas e reproduzíveis; arquivos legados não são a fonte única do novo esquema. | Prisma Migrate, baseline do legado e SQL complementar versionado para PostGIS, RLS e Realtime. |

**Decisões desta revisão:** Prisma será o ORM e o organizador das migrations no PostgreSQL do Supabase; Playwright será a ferramenta principal de testes de fluxos e API. Desenvolvimento será realizado por agentes, com tarefas e revisão no [plano de implementação](../../superpowers/plans/2026-09-29-geoalerta-core.md). Apenas o usuário revisa, faz commit, push, merge e deploy. Variáveis locais ficam exclusivamente em `.env` na raiz do repositório.
