# PRD — GeoAlerta Core

**Estado:** proposta para revisão em 29/09/2026. **Horizonte:** próxima release, sem atribuição de versão semântica. **Catálogo de histórias e requisitos:** [requirements.md](requirements.md).

## 1. Problema e objetivo

Em uma crise climática, cidadãos precisam registrar ocorrências com localização e a equipe municipal precisa identificar, priorizar e acompanhar cada caso sem perder alterações feitas por outros operadores. A próxima release terá apenas dois recursos de produto: **abertura de ocorrência** e **gestão administrativa das ocorrências**.

Sucesso significa que uma ocorrência válida aparece no painel com prioridade calculada, pode percorrer um ciclo de vida auditável e só é lida ou alterada por quem tem permissão. O cidadão não precisa de conta. O sistema deve continuar operável para 10 usuários simultâneos no backoffice e um histórico de pelo menos 50 mil ocorrências.

## 2. Premissas e limites da release

- **Carga de planejamento:** 100 **novas ocorrências** por hora nos períodos de crise. É uma premissa de projeto, ainda não uma medição ou limite comprovado. Testes devem incluir rajadas acima dessa média.
- **Cidadão:** envio sem login; nome e contato informados são dados da ocorrência, não uma identidade autenticada.
- **Localização:** captura por API nativa de geolocalização do navegador; ausência ou coordenada inválida impede envio. A precisão informada pelo dispositivo é armazenada e exibida. Não se presume que um cliente anônimo seja incapaz de alterar os valores enviados.
- **Município:** a release opera inicialmente em um município, mas o modelo de autorização mantém grupo/escopo explícito para evitar acesso cruzado futuro.
- **Fotos:** opcionais; falha no envio da foto não deve resultar em ocorrência aparentemente concluída sem confirmação clara ao cidadão.
- **Notificações:** somente alertas in-app para o fluxo operacional. CSV é download local, sem sincronização com planilhas externas.
- **Dados legados:** não apagar tabelas, fotos ou registros dos módulos desativados durante esta release.

## 3. Personas e papéis

| Persona/papel | Necessidade | Limite de acesso |
|---|---|---|
| Cidadão | Abrir ocorrência rapidamente e obter protocolo | Sem consulta pública de dados de outros cidadãos |
| Consulta | Acompanhar painel, lista e detalhe permitido | Não cria, edita, exclui nem administra |
| Operador | Triar, registrar manualmente e atualizar ocorrências | Apenas grupos atribuídos; não administra usuários ou regras |
| Gestor | Fazer o trabalho do operador e acompanhar todos os casos do seu escopo | Pode reabrir casos encerrados mediante justificativa |
| Administrador | Gerir acesso, regras de status e zonas de risco | Pode excluir logicamente e restaurar, sempre com auditoria |

**Grupo** representa a unidade/órgão de atendimento e determina o escopo de leitura e escrita. **Papel** define capacidades. Uma conta pode pertencer a mais de um grupo; nenhuma conta recebe acesso amplo apenas por estar autenticada.

| Capacidade | Consulta | Operador | Gestor | Administrador |
|---|:---:|:---:|:---:|:---:|
| Dashboard, mapa, lista e detalhe sem dados pessoais | Sim | Sim | Sim | Sim |
| Nome, contato e foto do cidadão | Não | Sim | Sim | Sim |
| Criar, editar e fazer transições ordinárias | Não | Sim | Sim | Sim |
| Reclassificar prioridade ou reabrir caso encerrado | Não | Não | Sim | Sim |
| Exportar CSV | Não | Não | Sim | Sim |
| Excluir/restaurar logicamente; gerir usuários, regras e zonas | Não | Não | Não | Sim |

Para Consulta, Operador e Gestor, “Sim” vale somente nos grupos atribuídos. Administrador opera no município configurado, com todas as ações auditadas.

## 4. Superfícies da release

| Rota proposta | Público | Conteúdo |
|---|---|---|
| `/` | Cidadão | Formulário de abertura e confirmação com protocolo |
| `/login` | Backoffice | Autenticação de usuários cadastrados pelo administrador |
| `/painel` | Backoffice | Home/dashboard, mapa, contagens e alertas in-app |
| `/painel/ocorrencias` | Backoffice | Lista, filtro rápido no menu lateral, filtros, ordenação, colunas e CSV |
| `/painel/ocorrencias/[id]` | Backoffice | Detalhe, edição, histórico e ações permitidas |
| `/painel/perfil` | Backoffice | Dados e preferências da própria conta |
| `/painel/admin` | Administrador | Usuários, grupos, papéis, regras de status e zonas de risco |

O menu lateral apresenta estados como atalhos para a lista. Filtro, ordenação e paginação ficam na URL para que a visão possa ser revisitada. Preferências de colunas são pessoais e não alteram a visão de outros operadores.

**Campos mínimos da ocorrência:** protocolo, tipo, descrição, nome e contato informado pelo cidadão, latitude, longitude, precisão, evidência opcional, prioridade, status, grupo responsável, data de abertura e última atualização. A lista oferece como colunas protocolo, abertura, tipo, prioridade, status e grupo; coordenadas e nome do cidadão são opcionais e só aparecem para quem pode lê-los. Filtros incluem período, status, prioridade, tipo e grupo autorizado; ordenação fica restrita a campos indexáveis expostos pela API.

**Campos mínimos da conta administrativa:** nome, e-mail institucional, telefone opcional, papel, grupos, estado de acesso, data de criação e último acesso. O próprio usuário edita apenas nome, telefone e preferências. O administrador altera papel, grupos e estado. Novas ocorrências públicas entram no grupo operacional padrão do município, configurado na administração; um usuário autorizado pode reatribuí-las com evento de auditoria.

## 5. Histórias de usuário e comportamento esperado

### US-01 — Abertura pública (`RF-001` a `RF-004`)

**Como** cidadão, **quero** informar tipo, descrição, nome/contato e evidência opcional usando minha localização atual, **para** pedir atendimento sem criar uma conta.

- **Dado** que o navegador concedeu localização válida, **quando** envio uma ocorrência, **então** recebo um protocolo único após a gravação confirmada.
- **Dado** que não há localização ou que a coordenada está fora dos intervalos válidos, **quando** tento enviar, **então** o registro é recusado com instrução para tentar obter a localização novamente.
- **Dado** que o ponto está dentro de uma zona ativa de inundação/risco, **quando** a ocorrência é gravada, **então** sua prioridade persistida é `ALTA` e a zona correspondente fica registrada para auditoria.
- **Dado** que o ponto não está em zona ativa, **quando** a ocorrência é gravada, **então** sua prioridade persistida é `NORMAL`.
- **Dado** que a mesma tentativa é reenviada por falha de rede, **quando** chega com a mesma chave de idempotência, **então** retorna o mesmo protocolo sem duplicar a ocorrência.

### US-02 — Login e perfil (`RF-005`, `RF-006`)

**Como** integrante do backoffice, **quero** entrar com minha conta e atualizar meus dados permitidos, **para** trabalhar com identificação individual.

- **Dado** que a conta está ativa, **quando** as credenciais são válidas, **então** o usuário entra no painel com seu papel e grupos.
- **Dado** que a conta está suspensa ou desativada, **quando** tenta acessar qualquer operação protegida, **então** o acesso é negado mesmo com uma sessão prévia.
- **Dado** que estou no meu perfil, **quando** atualizo nome ou telefone, **então** apenas minha conta muda; papel, grupo e estado não são editáveis nessa tela.

### US-03 — Dashboard (`RF-007`)

**Como** operador, **quero** ver mapa, contagens e novas ocorrências no meu escopo, **para** priorizar o atendimento.

- **Dado** que uma nova ocorrência autorizada foi persistida, **quando** o painel está aberto, **então** recebo alerta visual in-app e posso abrir seu detalhe.
- **Dado** que perco a conexão em tempo real, **quando** ela retorna, **então** o painel busca o estado atual para recuperar eventos perdidos.
- **Dado** que há histórico extenso, **quando** abro o mapa, **então** ele consulta um recorte espacial/temporal e não todos os registros.

### US-04 — Lista operacional (`RF-008`, `RF-009`, `RF-016`)

**Como** operador, **quero** filtrar, ordenar e configurar colunas da lista, **para** encontrar rapidamente o trabalho relevante.

- **Dado** que seleciono um status no menu lateral, **quando** abro a lista, **então** o filtro aparece na URL e os resultados são paginados no servidor.
- **Dado** que aplico filtros e ordenação, **quando** mudo a página, **então** os mesmos critérios são preservados.
- **Dado** que oculto uma coluna, **quando** volto à lista, **então** minha preferência é restaurada sem afetar outros usuários.
- **Dado** que sou gestor ou administrador, **quando** exporto CSV, **então** recebo o conjunto filtrado autorizado completo, independentemente da página visível, com células tratadas contra fórmulas executáveis.

### US-05 — Detalhe e ciclo de vida (`RF-010` a `RF-012`, `RF-015`)

**Como** operador, **quero** ler, criar e atualizar ocorrências conforme minhas permissões, **para** acompanhar o atendimento; **como** administrador, quero excluir logicamente registros com justificativa.

- **Dado** que tenho permissão e acesso ao grupo, **quando** abro o detalhe, **então** vejo campos, localização, foto autorizada e histórico pertinente; dados do cidadão são ocultados para papéis sem essa capacidade.
- **Dado** que altero campos ou status, **quando** salvo, **então** a versão atual é verificada, a mudança é atômica e um evento de auditoria registra ator, momento e diferenças.
- **Dado** que a transição de status é proibida, **quando** tento aplicá-la pela interface ou API, **então** a operação falha sem alteração parcial.
- **Dado** que sou administrador, **quando** excluo uma ocorrência com motivo, **então** ela sai das listas operacionais, permanece recuperável e a ação é auditada.

### US-06 — Administração (`RF-013` a `RF-015`)

**Como** administrador, **quero** gerenciar usuários, grupos, papéis, regras de status e zonas, **para** manter o acesso e o fluxo operacional sob controle.

- **Dado** que cadastro um usuário, **quando** atribuo papel e grupos, **então** as permissões efetivas refletem ambos; não existe autocadastro de operadores.
- **Dado** que suspendo ou desativo um usuário, **quando** ele tenta uma nova ação, **então** o servidor e o banco negam a operação; a mudança fica auditada.
- **Dado** que altero uma transição permitida, **quando** salvo, **então** a regra passa a valer para operações posteriores sem reescrever o histórico.
- **Dado** que desativo uma zona de risco, **quando** uma nova ocorrência é registrada no seu polígono, **então** essa zona não eleva a prioridade; classificações passadas continuam explicáveis pelo estado da época.

### US-07 — Desativação preservando legado (`RF-017`)

**Como** gestor do produto, **quero** retirar recursos, abrigos, equipes/GPS e voluntários da release, **para** concentrar operação e manutenção nas ocorrências.

- **Dado** que a release Core está ativa, **quando** um usuário abre menu ou rota direta desses módulos, **então** não consegue operá-los.
- **Dado** que os módulos foram desativados, **quando** a release é aplicada, **então** código, tabelas e dados permanecem preservados; assinaturas e transmissão GPS relacionadas deixam de rodar.

## 6. Ciclos de vida

### Ocorrência

Estados internos fixos nesta release: `NOVA`, `EM_TRIAGEM`, `EM_ATENDIMENTO`, `RESOLVIDA`, `CANCELADA`. `NOVA` é o estado inicial. O administrador pode habilitar/desabilitar **transições**, alterar rótulos de exibição e ordem; os códigos internos não são editáveis nem apagados nesta release.

Prioridade inicial é `ALTA` quando a localização intersecta qualquer zona ativa cadastrada e `NORMAL` nos demais casos. Alterações posteriores da zona não reclassificam silenciosamente ocorrências existentes. Toda reclassificação manual exige permissão de gestor ou administrador e justificativa auditada.

Transições iniciais: `NOVA → EM_TRIAGEM/CANCELADA`; `EM_TRIAGEM → EM_ATENDIMENTO/CANCELADA`; `EM_ATENDIMENTO → RESOLVIDA/EM_TRIAGEM`; `RESOLVIDA → EM_TRIAGEM` e `CANCELADA → EM_TRIAGEM` somente por gestor ou administrador, com justificativa. Todas são auditadas. Registros excluídos logicamente não recebem novas transições até serem restaurados.

### Usuário administrativo

Estados: `PENDENTE`, `ATIVO`, `SUSPENSO`, `DESATIVADO`. Só `ATIVO` opera o painel. Administração controla ativação, suspensão, desativação, papel e grupos. O usuário edita apenas nome, telefone e preferências próprias. Histórico de mudanças de acesso é preservado.

## 7. Dados e segurança

Entidades mínimas: ocorrência; evento de ocorrência; zona de risco com geometria e vigência/estado; usuário administrativo; grupo; vínculo usuário-grupo; papel/permissão; regra de transição; evento de auditoria. Dados do cidadão e fotos são privados. A foto é acessada por autorização temporária; URL pública permanente não atende este requisito.

A API valida entrada e autorização a cada operação. O banco mantém RLS coerente com papel e grupo, inclusive para leituras em tempo real. Não se aceita `service_role` no navegador. A triagem geográfica e a gravação de prioridade ocorrem no lado confiável e produzem um resultado persistido. A interface não recalcula prioridade como fonte oficial.

## 8. Metas não funcionais e verificação

Estas são **metas propostas**, a confirmar por teste de carga antes de declarar capacidade:

- 100 novas ocorrências/hora por pelo menos uma hora, incluindo rajadas de 10 envios em um minuto, com 10 sessões simultâneas de backoffice.
- Base de teste com ao menos 50 mil ocorrências, lista paginada e mapa delimitado; nenhuma exportação deve ser silenciosamente truncada.
- Em rede operacional, p95 da confirmação de registro sem foto até 3 segundos; p95 da primeira página da lista até 3 segundos; alerta in-app até 5 segundos após persistência. Fotos têm medição separada.
- Testes automatizados para cenários BDD, autorização positiva/negativa, concorrência, idempotência, geofencing, migração do esquema e CSV.
- Logs estruturados sem dados pessoais desnecessários; métricas de erro, latência, atraso Realtime e volume de Storage; procedimento de restauração de banco testado antes da ativação.

Fila/worker e separação em containers **não são exigências desta release**. Uma tarefa assíncrona só deve ser introduzida se trabalho secundário demorado, necessidade de repetição ou medições justificarem o custo. A classificação crítica e a confirmação do registro não dependem de um worker eventual.

## 9. Fora de escopo e estratégia de desativação

Ficam fora do produto ativo: gestão de recursos/estoques, abrigos, equipes, telemetria GPS, voluntários, despacho automático de equipes, sincronização com planilhas, notificações operacionais por e-mail, aplicativo nativo e motor de workflow arbitrário. O código existente não será excluído nesta release.

Desativar exige retirar navegação, proteger rotas diretas e impedir operações/assinaturas desses módulos. A migração de dados é aditiva e não usa `DROP` nas tabelas legadas. O rastreador `/rastreio`, hoje dedicado a equipes, também fica inativo.

## 10. Critérios de aceite da release

1. Todos os cenários BDD acima passam em ambiente de teste com permissões reais.
2. Um cidadão sem conta envia ocorrência com GPS e recebe protocolo; zona ativa sobreposta gera prioridade `ALTA` persistida.
3. Dois operadores podem trabalhar ao mesmo tempo sem perda silenciosa de atualização.
4. Um usuário sem capacidade adequada não lê dados do cidadão nem executa mutações pela API ou banco.
5. Dashboard, lista, detalhe, perfil e administração cumprem seus fluxos; CSV corresponde ao filtro autorizado completo.
6. Os quatro módulos legados e o rastreador de equipes não são operáveis, mas seus dados e código permanecem.
7. Os testes de carga e as metas da seção 8 são registrados com resultado e limites observados antes de publicação.

## 11. Decisões de engenharia para orientar as specs

Manter o repositório e implantar um **monólito modular** com limites hexagonais descritos na [arquitetura](architecture/README.md). O navegador não grava diretamente dados operacionais sensíveis; a API do Next.js coordena casos de uso, e PostGIS executa as consultas espaciais. RLS continua como defesa no banco.

**Prisma** será o ORM no servidor e **Prisma Migrate** organizará o histórico único de migrations da aplicação. Extensões, geometrias, índices espaciais, RLS, funções e configuração Realtime que não forem representados pelo schema Prisma serão mantidos em SQL complementar nas mesmas migrations. O [planejamento de banco](database/README.md) define conexões, baseline e preservação do legado; Supabase Auth, Storage e Realtime permanecem responsáveis pelos respectivos serviços.

**Playwright Test** automatizará cenários BDD de navegador e API, complementado por testes de domínio, banco/RLS e migrations reais, conforme o [plano de testes](testing/automated-tests.md). Os testes de carga têm execução e evidência próprias; sucesso em E2E não comprova capacidade.

O [plano de implementação](../../superpowers/plans/2026-09-29-geoalerta-core.md) define a execução por agentes, com revisão por tarefa e revisão integrada. Nenhum agente executa commit, push, merge ou deploy. Este conjunto de documentos é a especificação de entrada; mudanças de contrato durante a implementação exigem atualizar os documentos e seus testes.
