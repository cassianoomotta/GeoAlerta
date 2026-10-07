# Task 34 — apoio médico nas ocorrências (referência: ticket 1) — 06/10/2026

## Entrega local

- O formulário público exige escolha explícita de **Sim** ou **Não**, sem seleção inicial; ambos os valores são enviados como boolean.
- O contrato aceita `true`, `false` e `null`; omissão permanece `null` para compatibilidade com ocorrências antigas e com o fluxo manual.
- A coluna `needs_medical_support boolean` foi adicionada de forma anulável, sem valor padrão ou backfill. A migration concede leitura à role `geoalerta_runtime` e inserção às roles `geoalerta_runtime` e `geoalerta_ingest`.
- Detalhe, listagem e CSV exibem “Sim”, “Não” e “Não informado”. Os três valores foram cobertos em verificações de apresentação/exportação. O novo campo não altera prioridade, grupo, status ou classificação geográfica.
- A tentativa repetida após uma resposta incerta reutiliza o corpo e a chave de idempotência originais. Isso mantém o retry mesmo com os campos do formulário bloqueados.

## Verificações executadas

- `npm run test:unit -- tests/unit/public-input.spec.ts tests/unit/occurrence-persistence.spec.ts tests/unit/list-input.spec.ts tests/unit/export-csv.spec.ts tests/unit/manual-occurrence.spec.ts` — 27 passaram.
- `node scripts/with-env.mjs playwright test --project=api tests/api/public-occurrences.spec.ts tests/api/occurrence-detail.spec.ts tests/api/list-occurrences.spec.ts` — 22 passaram.
- `node scripts/with-env.mjs playwright test --project=chromium --project=mobile-chromium tests/e2e/public-occurrence.spec.ts tests/e2e/occurrence-detail.spec.ts` — 23 passaram. Cobriu escolha obrigatória, resposta Sim no registro, resposta Não no retry e confirmação no desktop e celular.
- `node scripts/with-env.mjs playwright test --project=api tests/api/public-occurrences.spec.ts -g "PostGIS inclui borda"` — 1 passou; com `needsMedicalSupport=true`, a prioridade continuou alta dentro de manchas ativas e normal fora delas.
- Após cobrir os três valores na exportação e detalhe, `npm run test:unit -- tests/unit/export-csv.spec.ts` passou (4 testes) e `node scripts/with-env.mjs playwright test --project=chromium tests/e2e/occurrence-detail.spec.ts -g "detalhe apresenta|ocorrência sem posição"` passou (2 testes).
- `npm run lint` — 0 erros; 8 avisos existentes em `RiskZonePanel.tsx` e `hosted-core-notifications-reconnect.spec.ts`, fora dos arquivos desta entrega.
- `npm run build` — passou após repetir fora do bloqueio de canonicalização do SWC no sandbox.
- `npm run test:db` — 31 passaram. Na primeira execução, três testes não iniciaram porque havia um diretório de migration vazio, local e não rastreado. Removi somente esse diretório vazio; não importei o SQL de outra branch. A execução completa posterior passou.
- A aplicação local da migration sobre o banco isolado preservou os 28.496 registros presentes antes dela: todos ficaram `NULL`, sem preencher resposta inferida. Os grants de `SELECT` e `INSERT` foram confirmados. Após os testes, o banco isolado continha dados sintéticos dos testes; não foi limpo.
- Os testes de API/lista e de banco restrito cobriram grupo, município, papel e RLS existentes. A leitura do campo usa o mesmo caminho e os mesmos filtros da ocorrência.

## Estado final

Todos os critérios de aceite e as validações pertinentes foram concluídos no ambiente local isolado. A suíte completa de banco passou após remover o diretório vazio que causava os erros de leitura. A Task 34 está **Done** no Notion.

Não houve acesso remoto, commit, push, merge ou deploy.
