# GeoAlerta — implementação do design system

> Execução local nesta sessão, a partir da proposta que o usuário pediu para implementar. Sem commits, pushes, merges ou deploys.

**Objetivo:** aplicar o vocabulário visual aprovado à interface ativa, com temas e componentes reutilizáveis e uma página de avaliação.

**Arquitetura:** `docs/design-system/tokens.json` permanece a fonte dos tokens. Um gerador produz CSS com canais RGB compatíveis com Tailwind 3. A preferência local Claro/Escuro/Sistema é aplicada antes da pintura e observada pelos componentes e mapa. Componentes genéricos residem em `src/components/ui`; prioridade e situação permanecem na feature de ocorrências.

**Stack:** Next.js 16.3.5, React 19, Tailwind 3, Lucide, Leaflet e Playwright existentes.

**Especificação:** `docs/design-system/geoalerta-design-system.md`.

## Restrições

- Claro por padrão; Sistema somente quando selecionado; persistência visual local.
- GPS, autorização, rótulos configurados, transições, filtros UTC, CSV e alertas deduplicados mantêm seus contratos.
- Nenhuma dependência, migração, serviço ou alteração de `.env` necessária.
- Módulos desabilitados e fluxos legados não serão ativados ou redesenhados nesta migração, conforme a especificação.
- Manter atribuição cartográfica; não escurecer tiles com filtros CSS.

## Verificação prioritária

- Primeiro acesso em dispositivo escuro ainda usa Claro; Sistema acompanha o dispositivo somente por escolha.
- Persistência, recarga, armazenamento indisponível e sincronização entre abas não impedem a leitura.
- Foco e erro associado são perceptíveis nos controles; loading bloqueia envio repetido.
- Temas e texto longo não causam overflow em 320/390/768/1440 px.
- Cores não confundem prioridade, situação e severidade de mensagens; labels municipais permanecem.

## Tarefas

### 1. Tokens e temas

- [x] Criar testes de navegador para padrão claro, preferência persistida, Sistema e armazenamento indisponível; observar falha antes da implementação.
- [x] Criar `scripts/generate-design-tokens.mjs`, `src/styles/tokens.css`, `src/components/theme/{theme,theme-provider,theme-select}` e atualizar `src/app/layout.tsx`, `tailwind.config.ts` e `src/app/globals.css`.
- [x] Conferir CSS gerado e execução dos testes de tema.

### 2. Componentes e documentação viva

- [x] Implementar Button, Field, Badge, InlineNotice, PageHeader, EmptyState e Skeleton, com props nativas e acessibilidade.
- [x] Implementar badges de domínio sem alterar rótulos de município.
- [x] Criar `/design-system`, com exemplos explicitamente fictícios, temas e estados de interação.
- [x] Validar teclado, campo inválido e largura mobile no navegador.

### 3. Interface ativa

- [x] Migrar login, shell e perfil; acrescentar preferência de aparência local ao perfil.
- [x] Migrar estilos de lista, detalhe, administração, formulário público e abrigos para papéis semânticos; preservar lógica.
- [x] Migrar mapa e alertas; prioridade alta recebe forma redundante e labels. Registrar o limite dos tiles claros no tema escuro.
- [x] Atualizar especificação com adoção realizada e limites restantes.

### 4. Validação e entrega

- [x] Executar unidade, lint por escopo, TypeScript, build Webpack e testes de navegador independentes de banco. Registrar bloqueios do lint global, Turbopack e E2E dependente de PostgreSQL.
- [x] Inspecionar screenshots desktop/mobile em ambos os temas em uma rodada conjunta; corrigir defeitos encontrados e confirmar uma vez.
- [x] Rodar detector Impeccable nos alvos alterados, revisar diff e registrar resultados.

## Registro de decisões

- Usar a branch `geo-alerta-0.1.1` indicada pelo usuário e manter as alterações locais.
- A aprovação para implementar a proposta existente permite elaborar e executar este plano na mesma sessão.
- O catálogo completo descreve também evoluções funcionais. Esta entrega aplica a camada visual e o tema; novas regras de conflito, coordenação de filas e densidade não serão simuladas como funcionalidades existentes.


## Resultado da execução

- 133 testes unitários e 7 testes de navegador do design system aprovados. TypeScript e lint dos arquivos da implementação aprovados; lint global mantém 67 erros e 32 avisos em código legado/preexistente.
- Build com Webpack aprovado; build padrão Turbopack falhou com EPERM ao abrir porta interna do processador CSS.
- Inspeção conjunta de catálogo, login e formulário público em 390/1440 px, claro/escuro: sem overflow ou erro JavaScript; uma rodada de correção e confirmação.
- Revisão independente apontou contorno de campos de abrigo e regra mobile de fonte; ambos corrigidos.
- Detector Impeccable sem ocorrências. Novos pares de primeiro plano em superfícies sólidas têm contraste >=4,5:1.
- E2E de acesso/lista/detalhe/GPS com banco não executado: PostgreSQL 5433 indisponível. Tentativas de container descartável não inicializaram; nenhum serviço persistente foi criado.
- Diferenças simultâneas de registro manual separado/navegação foram preservadas e não atribuídas à migração visual.

## Decisões adicionais

- Tiles OSM claros preservados até decisão do provedor escuro: não introduzir serviço que exige chave, nem falsificar cartografia por filtro CSS. Limite: superfície do mapa permanece clara no tema escuro.
- Metadado de cor é criado pelo bootstrap e observado pelo tema, sem tag estática concorrente: React hoista metadados por conteúdo e duplicava a tag após alteração antes de hidratação.
- Classes de variante de botão são literais para o compilador Tailwind: montar `btn-${variant}` removia estilos primário/destrutivo do CSS final.
