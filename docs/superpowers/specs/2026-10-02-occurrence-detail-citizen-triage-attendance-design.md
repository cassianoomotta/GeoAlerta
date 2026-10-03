# Detalhe da ocorrência: cidadão, triagem e atendimento

**Status:** aprovada, implementada e aplicada no Supabase GeoAlerta após autorização explícita em 2026-10-02  
**Data:** 2026-10-02

## Objetivo

Organizar a tela aberta pelo protocolo em seções que separem os dados privados do cidadão, o relato e a localização, os impactos da ocorrência e as providências realizadas. Permitir que agentes registrem mais de um atendimento sem sobrescrever o histórico anterior.

## Decisões aprovadas

- O detalhe terá quatro seções: **Informações do cidadão**, **Informações da ocorrência**, **Impactos e triagem** e **Atendimento e providências**.
- A planilha `modelo - em 2026.xlsx` é referência de campos e opções, não fonte para sincronização ou importação automática. A aba `B A S E` contém os campos de registro; `DADOS` contém valores usados como listas.
- Os campos estruturados terão filtros específicos. Consultas não usarão `LIKE` por padrão; usarão igualdade, seleção múltipla, referências a catálogos e intervalos de data.
- Preservar o ciclo de vida interno de ocorrências do Core e os dados existentes. Mudanças no banco serão aditivas, sem apagar tabelas ou histórico.
- Dados pessoais permanecem separados e com autorização própria. Gravações e leituras operacionais continuam limitadas à sessão ativa, capacidade e grupos autorizados.

## Organização da tela

### Informações do cidadão

Exibir nome e contato do solicitante quando a sessão possuir capacidade `privateData`. A falta dessa capacidade oculta os valores e mantém o restante do detalhe disponível conforme as permissões existentes. Esses dados vêm de `occurrence_private_data`; não devem ser copiados para o evento de atendimento, histórico Realtime, URL ou log.

### Informações da ocorrência

Exibir protocolo, tipo, descrição original, endereço, bairro, localidade/interior, coordenadas, data e hora de recebimento, instituição que registrou, grupo responsável, prioridade e status interno. A data e hora de recebimento correspondem à abertura já registrada pelo sistema. O formulário público continua identificando o cidadão como origem; registros feitos por agentes identificam o órgão registrador escolhido e o agente autenticado que realizou a ação.

### Impactos e triagem

Registrar situação (`EM_RISCO` ou `JA_OCORREU`), local do dano, existência de vítimas e existência de desalojados. Vítimas e desalojados aceitam `SIM`, `NAO` ou `NAO_INFORMADO`; `NULL` representa informação ainda não coletada e não pode ser exibido como resposta negativa. `OUTROS` no local do dano permite uma descrição complementar.

### Atendimento e providências

Exibir uma linha do tempo de atendimentos. Cada registro guarda órgão que atendeu, responsável informado, data/hora do atendimento, providência realizada, resultado/observação, indicação de reforço solicitado, autor autenticado que registrou e data/hora automática de gravação. O autor da gravação não substitui o nome do agente que compareceu.

O registro é acrescentado à linha do tempo; uma providência nova não edita a anterior. Se houver erro, registra-se uma correção auditável sem apagar o dado original. Apenas usuários com capacidade operacional no grupo da ocorrência podem acrescentar providências. A ocorrência continua usando os estados Core `NOVA`, `EM_TRIAGEM`, `EM_ATENDIMENTO`, `RESOLVIDA` e `CANCELADA`; uma providência não cria um segundo status concorrente. “Solicitou reforço” é um atributo/evento da providência. “Atendida” deve acompanhar a transição autorizada para `RESOLVIDA`, se essa transição estiver permitida.

## Campos de referência da planilha

| Campo da planilha | Destino proposto |
| --- | --- |
| Data e hora recebida | Abertura da ocorrência existente |
| Instituição que cadastrou | Instituição registradora estruturada; “Cidadão” para a origem pública |
| Nome do solicitante, telefone | Informações privadas do cidadão |
| Endereço/número, bairro, interior | Informações da ocorrência; bairro e localidade com opções estruturadas |
| Tipo de ocorrência, descrição | Tipo já existente no catálogo e relato da ocorrência |
| Situação da ocorrência | Impactos e triagem: em risco ou já ocorreu |
| Onde o dano ocorreu? | Local de dano estruturado, com opção “Outros” e detalhe |
| Possui vítimas/desalojados? | Booleanos anuláveis para sim, não e não informado |
| Status da ocorrência | Estado interno Core existente, sem cópia em outro campo |
| Quem atendeu a ocorrência? | Órgão e responsável em cada registro de atendimento |
| Histórico da ocorrência | Linha do tempo de providências, com autor e horário auditáveis |

O campo “Status da ocorrência” da planilha contém `NÃO ATENDIDA`, `EM ANDAMENTO`, `ATENDIDA` e `SOLICITOU REFORÇO`. A interface não deve salvar esse conjunto como um segundo status. A apresentação usa o estado Core atual; “solicitou reforço” fica registrado na providência.

## Modelo de dados proposto

- Estender `public.occurrences` com referências opcionais para instituição registradora, bairro, localidade/interior e local de dano, mais `occurrence_situation`, `has_victims`, `has_displaced` e descrição complementar para local de dano `OUTROS`. Campos opcionais preservam linhas antigas sem inventar respostas.
- Criar catálogos pequenos e versionáveis para instituições, bairros, localidades/interior e locais de dano, carregando somente as opções validadas na aba `DADOS`. Manter códigos estáveis separados dos rótulos de exibição. Tipos de ocorrência continuam no catálogo atual `occurrence_types`.
- Criar `public.occurrence_service_records` em relação um-para-muitos com `occurrences`. A tabela tem campos estruturados para órgão, responsável, horário atendido, ação, resultado e reforço solicitado, além de `actor_id` e `created_at` definidos pelo servidor. A política RLS verifica acesso à ocorrência pai e o grupo autorizado.
- Manter `occurrence_events` e `core_occurrence_history` como trilha técnica/auditoria. Texto de providências fica em `occurrence_service_records`, não em `changes` JSON nem no feed de alertas.
- Atualizar API e contrato do detalhe para retornar dados conforme permissão; adicionar comando transacional para gravar providência e evento de auditoria. Nenhum dado pessoal segue para o feed Realtime.

## Filtros e consultas

Os filtros estruturados propostos são tipo, status Core, prioridade, grupo, instituição registradora, bairro, localidade/interior, situação, local do dano, vítimas, desalojados, órgão atendente e intervalo de abertura/atendimento. Valores categóricos usam identificadores de catálogo com `=`, filtros múltiplos usam `IN`, e períodos usam limites `>=`/`<`. Para booleanos, a interface oferece `Sim`, `Não` e `Não informado`.

Não implementar busca `%texto%` nem `LIKE` para esses campos. Um texto livre só será considerado se houver necessidade confirmada que não possa ser atendida pelos filtros. Nessa situação, avaliar busca textual/indexação própria e medir o plano de execução antes de adicionar a consulta.

Adicionar índices B-tree somente para combinações de filtro e ordenação que a interface realmente oferecerá. Priorizar escopo de grupo e data, chaves de catálogo e consultas da linha do tempo. Evitar índices isolados em booleanos de baixa seletividade. Confirmar cada índice com `EXPLAIN (ANALYZE, BUFFERS)` e volume representativo em banco descartável.

## Permissões e privacidade

- Exigir `privateData` para nome e contato do cidadão, conforme o modelo Core; autorização é verificada no servidor, não só ocultada no React.
- Exigir `operate` e escopo de grupo autorizado para acrescentar providências. A leitura obedece ao mesmo escopo de ocorrência.
- Persistir providências e auditoria na mesma transação. IDs e horários do autor de gravação são derivados da sessão e do servidor, não aceitos do cliente.
- Não expor textos de atendimento, nomes de cidadão ou responsáveis no feed Realtime, CSV público ou confirmação do cidadão.
- Aplicar migrations aditivas em base Docker descartável e verificar RLS/grants para Administrador, Gestor, Operador e Consulta. A aplicação remota ficou fora do escopo inicial; após autorização explícita em 2026-10-02, as migrations `202610020006` a `202610020009` foram aplicadas e verificadas no Supabase GeoAlerta. Evidência: `docs/releases/core/testing/results/occurrence-detail-migrations-2026-10-02.md`.

## Verificação prevista

- Testes de domínio para valores de situação, triagem, booleano desconhecido, referências de catálogos e reforço solicitado.
- Testes de API para leitura restrita, inclusão de providência, grupo não autorizado, ator/timestamp controlados pelo servidor, transição de status e dados pessoais.
- Testes de banco para migration aditiva, integridade referencial, RLS, índices e preservação das ocorrências já existentes.
- E2E para abrir o detalhe por protocolo, confirmar as quatro seções, editar campos permitidos, registrar duas providências sem sobrescrever a primeira e confirmar visibilidade por perfil.
- Testar filtros por igualdade/intervalo nos dados representativos e inspecionar planos SQL. Nenhum teste ou consulta nova depende de `LIKE`.

## Fora do escopo

- Sincronização bidirecional com planilha ou importação automática de ocorrências.
- Alterar os códigos internos do ciclo de vida Core.
- Despacho automático de equipes, reativação dos módulos legados de equipes/voluntários ou gestão de recursos.
- Exposição pública de dados de cidadão, agente, atendimento ou grupo além do protocolo/status permitido.
