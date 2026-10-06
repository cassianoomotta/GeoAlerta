# GeoAlerta — validação da implementação visual

Data: 06/10/2026. Branch local: `geo-alerta-0.1.1`.

A base visual da proposta foi integrada às telas ativas: tokens semânticos, temas Claro/Escuro/Sistema, componentes reutilizáveis, login, navegação, perfil, ocorrências, administração, abrigos, formulário público, mapa e alertas. O catálogo `/design-system` apresenta exemplos fictícios e estados de interação. As evoluções funcionais descritas na especificação continuam como requisitos futuros quando não existem no produto.

## Verificações realizadas

| Verificação | Resultado |
| --- | --- |
| `npm run design:check` | CSS gerado consistente com o inventário de tokens |
| `npm run test:unit` | 133 testes aprovados |
| `npm run test:design-system` | 7 testes de navegador aprovados |
| `npx tsc --noEmit` | Aprovado |
| ESLint de `src/app`, `src/features`, novos componentes, gerador, configuração e testes do design system | Aprovado |
| `npm run build -- --webpack` | Aprovado |
| Detector Impeccable no escopo visual alterado | Nenhuma ocorrência |
| Contraste numérico dos pares declarados em `contrast-report.json` | 56 pares, sem falhas nos mínimos declarados |

Os testes de navegador verificam o padrão claro mesmo em dispositivo escuro, escolha explícita de Sistema, reação à aparência do dispositivo, persistência e recarga, armazenamento indisponível, sincronização entre abas e remoção da preferência, metadado de cor único, associações acessíveis dos campos, bloqueio de botão carregando e contraste real dos botões sólidos em ambos os temas. Conferem também overflow em 320/390/768/1280/1440 px e fonte mínima/alvos de toque no formulário público, com envio bloqueado sem localização.

A inspeção visual conjunta cobriu catálogo, login e formulário público em 390 e 1440 px, Claro e Escuro: 12 capturas por rodada, sem overflow ou erros JavaScript. Uma rodada de correção foi seguida de confirmação. A revisão independente identificou contraste do contorno em campos de abrigo e especificidade da regra mobile de fonte; ambos foram corrigidos. Os testes também detectaram e confirmaram correções de classes de botão removidas pelo Tailwind e de sincronização do tema durante a hidratação.

## Limites registrados

- Os tiles OpenStreetMap permanecem claros em ambos os temas; marcadores, legenda, popups e controles acompanham o tema. Não foram aplicados filtros CSS ao mapa. A escolha de cartografia escura continua pendente: o provedor CARTO consultado exige configuração de chave para o uso apresentado em sua [documentação oficial](https://github.com/CartoDB/basemap-styles).
- Os E2E existentes de acesso, lista, detalhe e formulário público não chegaram a executar: o PostgreSQL de teste em `localhost:5433` estava indisponível (`ECONNREFUSED`). As tentativas de iniciar um container descartável não concluíram a inicialização; nenhum serviço persistente foi criado. Os testes visuais independentes do banco passaram.
- O lint global ainda apresenta 67 erros e 32 avisos em arquivos legados/preexistentes, fora do escopo aprovado no lint da implementação. `.cache` foi excluído por conter saídas geradas.
- O build padrão com Turbopack falhou neste ambiente com `EPERM` ao abrir uma porta interna do processamento CSS. A compilação de produção com Webpack passou.
- O cálculo de contraste cobre pares opacos declarados e os botões sólidos testados; não representa uma auditoria completa de acessibilidade. Avaliação prolongada com operadores, zoom de 200%, estados de conexão/conflito e operação com dados reais continuam pendentes.

## Escopo e preservação

Não houve alteração de `.env`, migração de banco, nova dependência de aplicação, commit, push, merge ou deploy. A lógica existente de autorização, GPS nativo, triagem geográfica, CSV e notificações foi preservada na migração visual; sua verificação integrada com banco permanece sujeita ao limite acima.

Mudanças simultâneas de registro manual separado e navegação foram preservadas. Não são atribuídas a esta implementação visual. Módulos desabilitados não foram reativados.

Para revisar localmente, iniciar `npm run dev` e abrir `/design-system`, `/login` e o formulário público `/`. Os resultados e decisões de execução estão também no plano `docs/superpowers/plans/2026-10-06-design-system.md`.
