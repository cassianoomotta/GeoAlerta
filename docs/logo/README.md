# Logo GeoAlerta

[`geoalerta.svg`](./geoalerta.svg) é a vetorização da logo transparente aprovada na conversa: quatro formas arredondadas envolvendo o cidadão no centro. Símbolo e assinatura estão em contornos vetoriais, sem imagens embutidas ou dependência de fontes. O fundo permanece transparente e a proporção original é preservada. Os arquivos da marca e o script [`sync-colors.mjs`](./sync-colors.mjs) estão em `docs/logo/`.

## Cores do design system

- `primary`: formas originalmente azuis e a palavra **Geo**.
- `danger`: cidadão no centro, segmento de destaque e a palavra **Alerta**.

A fonte de cores é [`docs/design-system/tokens.json`](../design-system/tokens.json). Execute `npm run design:tokens` após atualizar os tokens ou `docs/logo/geoalerta.svg`: o processo atualiza `src/styles/tokens.css`, as cores de fallback do SVG e o componente React gerado em `src/components/brand/geoalerta-logo.tsx`. `npm run design:check` verifica a sincronização dos três arquivos.

## Uso

O painel e o menu móvel usam `GeoAlertaLogo`, gerado a partir de `geoalerta.svg` e renderizado **inline** no DOM. As formas herdam `--primary` e `--danger` da página, acompanhando a seleção Claro/Escuro/Sistema em tempo real. Para reutilizar a marca, importe esse componente e defina a dimensão por `className`. Edite o SVG original e regenere o componente; não edite os contornos gerados manualmente.

Um SVG carregado via `<img>` ou `next/image` não herda as variáveis CSS nem o tema escolhido na página. Nesse uso, este arquivo usa as cores sincronizadas e acompanha a preferência de tema do sistema operacional. Para uma exportação com tema fixo, acrescente `data-theme="light"` ou `data-theme="dark"` ao elemento `<svg>`.

Os atributos `fill` também contêm a paleta clara atualizada para ferramentas de edição que não interpretam variáveis CSS. Editores sem suporte às regras de tema exibirão essa paleta.

O PNG anterior permanece disponível como histórico. As apresentações existentes não foram alteradas.
