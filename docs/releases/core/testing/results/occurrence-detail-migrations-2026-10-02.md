# Aplicação remota das migrations de detalhe — 02/10/2026

## Autorização e alvo

O usuário autorizou explicitamente a aplicação das migrations `202610020006` a `202610020009` no Supabase GeoAlerta. O projeto confirmado foi `fwqbwqxgajnrjwccdebh` (GeoAlerta, região `sa-east-1`). A aplicação ocorreu depois de um preflight somente de leitura que confirmou que as quatro migrations não estavam no histórico Prisma, que os catálogos/colunas ainda não existiam e que havia 24 ocorrências ativas.

## Alterações aplicadas

- `202610020006_occurrence_triage_and_service_records`: cinco catálogos com 90 opções iniciais, oito colunas anuláveis em `occurrences`, histórico append-only de atendimento, chaves estrangeiras, índices, trigger, RLS e grants.
- `202610020007_occurrence_triage_runtime_column_grants`: leitura dos oito campos estruturados pela role de runtime.
- `202610020008_occurrence_service_audit`: política de inserção de auditoria de atendimento com escopo de grupo.
- `202610020009_occurrence_situation_filter_index`: índice para filtrar por situação e ordenar por data.

Os scripts SQL locais foram aplicados em ordem pelo Supabase MCP. O histórico Prisma `public._prisma_migrations` recebeu os quatro nomes e checksums calculados dos arquivos locais. O histórico do Supabase também registra as aplicações: `20261003014555`, `20261003014614`, `20261003014623` e `20261003014634`, respectivamente.

## Verificação

- As cinco tabelas de catálogo e a tabela de atendimentos existem; RLS está habilitado nas seis.
- Os catálogos têm 3 instituições, 12 bairros, 50 localidades, 17 locais de dano e 8 órgãos atendentes.
- As oito colunas de triagem existem, e os grants de `SELECT` para `geoalerta_runtime` foram confirmados.
- As políticas de auditoria e de atendimento estão presentes; os índices de linha do tempo, órgão e situação foram confirmados.
- Os quatro registros do Prisma têm `finished_at`, não foram revertidos e têm checksum igual ao SQL local.
- A contagem das ocorrências antes e depois permaneceu em 24 total e 24 ativas.
- A página autenticada `/painel/ocorrencias` carregou após atualização e exibiu **24 ocorrências · Página 1 de 1**.

Nenhuma ocorrência ou tabela legada foi excluída. Nenhum commit, push, merge ou deploy foi executado.

