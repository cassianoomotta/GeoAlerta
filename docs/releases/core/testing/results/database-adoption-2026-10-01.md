# Adequação do Supabase ao Core — 01/10/2026

O projeto Supabase GeoAlerta recebeu o histórico de 30 migrations da branch `geo-alerta-0-1-0`, após backup local autorizado em `.cache/operational-backup/pre-core.backup`. A adoção foi ensaiada em PostgreSQL/PostGIS isolado e executada em transação com comparação integral das linhas das onze tabelas legadas. As 17 ocorrências e os dados dos módulos desativados foram preservados.

A zona legada foi arquivada em `legacy_risk_zones` e importada para geometria PostGIS versionada com o mesmo UUID. A migração não reclassificou ocorrências anteriores. Campos, relações, índices, auditoria, controle de versão, estados, permissões e políticas seguem o histórico Core. Foram corrigidos problemas encontrados de recursão/performance de RLS e de criação administrativa de grupos.

A conta existente `admin@prefeitura.gov.br` recebeu ADMINISTRADOR ATIVO. As conexões `geoalerta_runtime` e `geoalerta_ingest` usam LOGIN próprio, sem superusuário ou bypass de RLS, e TLS validado. Credenciais e a chave de servidor existente foram salvas somente no `.env` local autorizado. A ingestão não lê ocorrências; a conexão de painel acessa dados apenas com identidade autorizada. A inspeção remota de grants confirmou ausência de SELECT direto para `anon`/`authenticated` em `occurrences` e `occurrence_private_data`; o acesso passa pelo backend autorizado.

As onze fotos foram copiadas para o bucket privado Core e verificadas byte a byte (24.452.890 bytes). Objetos originais foram preservados, o bucket antigo ficou privado e seu cache CDN foi purgado. A verificação final negou downloads pelas onze URLs públicas antigas e assinatura privada anônima.

Evidências:

- [Verificação do banco remoto e das permissões](remote-core-verification-2026-10-01.json).
- [Cópia e integridade das fotos](legacy-private-photos-2026-10-01.json).
- [Ticket 19: restauração final aprovada](ticket-19-docker-current-2026-10-01.json).
- [Auth, Storage e Realtime reais em Docker](real-services-2026-10-01.json).

O linter remoto ainda aponta itens da extensão PostGIS preexistente em `public`: `spatial_ref_sys` sem RLS e as funções C `st_estimatedextent` expostas. Esses objetos pertencem a `supabase_admin`; mover a extensão exige planejamento das dependências espaciais e não integra esta adoção preservadora. A proteção contra senhas vazadas do Auth também permanece desabilitada. Não se afirma aprovação integral dos advisors de segurança.

O teste de restauração cobre dados e esquema de aplicação, não uma recuperação completa de Auth/Storage/infraestrutura Supabase. A stack Docker dos testes usa serviços reais oficiais e dados sintéticos; os resultados de capacidade local não equivalem a medição de produção.
