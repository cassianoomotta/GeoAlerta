# Quadro de situação — dashboard `/painel`

Implementação local de 06/10/2026, voltada à leitura rápida e à passagem de situação pelo comandante. Mantém os temas e tokens do design system em uso.

## Conteúdo e critérios

- Indicadores: total, abertas (novas + em triagem + em atendimento), em atendimento e prioridade alta.
- Barras: novos registros por dia, incluindo dias sem registros.
- Pizza: status atual dos registros criados no período, com quantidade e percentual.
- Colunas: registros por tipo, ordenados pela quantidade.
- Área: aberturas por data de criação e encerramentos efetivos por data de transição. Encerramentos incluem ocorrências criadas antes do período.
- Uma ocorrência encerrada mais de uma vez no mesmo dia conta apenas uma vez nesse dia. Uma nova conclusão após reabertura em outro dia conta naquele dia. Trocas entre dois estados terminais e edições posteriores não geram encerramentos adicionais.
- Todos os gráficos compartilham o filtro de datas. São aceitos até 31 dias de calendário; sem filtro, é consultado todo o histórico autorizado.
- Dias são calculados em `America/Sao_Paulo`. O intervalo UTC é `[início, próxima meia-noite após o último dia)`, incluindo timestamps com microssegundos no último dia.
- Ocorrências excluídas não são contadas. As consultas respeitam o escopo de acesso do usuário.
- Atualização automática a cada 15 segundos quando a aba está visível. A última consulta confirmada fica identificada pelo horário; erros de atualização preservam os dados com aviso de desatualização. Mudanças de filtro não exibem dados do período anterior.
- Gráficos têm legendas e tabelas consultáveis para os valores exatos. Categorias longas ficam completas na tabela e nas dicas do SVG.

## Banco e implantação

Migration local: `prisma/migrations/202610060001_dashboard_closures/migration.sql`.

A função interna `core_dashboard_closures` projeta exclusivamente contagens diárias do histórico. Preserva as restrições de leitura de `changes`/`reason`, exige identidade ativa e acesso ao grupo pelo helper existente. Sua execução é concedida apenas a `geoalerta_runtime`; não há concessão a `PUBLIC`, `anon` ou `authenticated`.

A migration foi inicialmente validada em PostgreSQL/PostGIS descartável local com dados sintéticos. Em 06/10/2026, após a autorização explícita do usuário (“aplique o migration”), foi aplicada ao projeto Supabase usado pela aplicação (`fwqbwqxgajnrjwccdebh`) e registrada no histórico do Supabase e do Prisma. Checksum SHA-256 do arquivo: `f88eb73e966c70dab751b1505bf0cc0cd0676627140cc2aabb618f81e5dee84e`.

A conferência posterior confirmou função existente, índice válido, execução autorizada a `geoalerta_runtime` e negada a `anon`/`authenticated`, sem liberar leitura de `changes`. Consultas somente de leitura pela conexão restrita real da aplicação retornaram 25 ocorrências autorizadas e 2 encerramentos registrados no histórico. Nenhuma ocorrência foi alterada nessa aplicação da migration. Não houve commit, push, merge ou publicação da aplicação.

## Verificação

Resultado final: **142 testes unitários**, **1 teste de banco** e **5 testes de API/navegador** aprovados; TypeScript, lint dos arquivos desta alteração e build com Webpack aprovados.

- Testes unitários de períodos, dias vazios, indicadores e encerramentos de ocorrências antigas.
- Teste SQL de contagens reais, deduplicação, microssegundos, acesso por grupo/papel, exclusão e ausência de concessões públicas.
- Testes de API autenticada, filtros inválidos, escopo de acesso e ausência de dados privados na resposta.
- Testes de navegador dos quatro gráficos, filtro comum, estados vazio/erro e ausência de overflow em desktop e celular, nos temas claro/escuro.
- TypeScript e lint dos arquivos alterados.
- Build local validado com `next build --webpack`. O build padrão com Turbopack encontrou restrição de criação de processo/porta neste ambiente.

As capturas com dados sintéticos dos testes ficam em `.cache/dashboard-preview/` (não versionadas).

## Pergunta para a próxima sessão

**Qual a complexidade de tornar os gráficos clicáveis para servir como filtro e/ou realizar drill-down?**

Definir se o clique deve filtrar os demais gráficos, abrir a lista de ocorrências correspondente ou detalhar uma série. Para a série de encerramentos, o detalhe deve usar a data do evento, incluindo registros anteriores ao período; a lista atual filtra pela criação. Também definir como limpar a seleção, combinar filtros, preservar o período e oferecer a mesma interação por teclado. Nenhum filtro por clique ou drill-down foi implementado nesta sessão.
