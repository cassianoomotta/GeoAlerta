# GeoAlerta Core

O GeoAlerta Core reúne o registro público de ocorrências e o painel municipal para triagem e acompanhamento. Este repositório também conserva módulos legados; nem tudo que aparece no histórico ou no código antigo está habilitado para uso.

## Guia de operação

- [Guia operacional](docs/releases/core/guia-operacional.md): passos para cidadãos, operadores, gestores e administradores, com resultados esperados e recuperação de falhas.
- [Documentação do projeto](docs/README.md): índice das especificações, da arquitetura e das evidências de validação.
- [Escopo Core](docs/releases/core/README.md): PRD, requisitos, arquitetura, dados e testes previstos.

## Escopo ativo descrito neste guia

- Registro público de ocorrências com localização GPS obrigatória, foto opcional e protocolo após confirmação.
- Painel autenticado com indicadores, mapa, alertas in-app, lista, detalhes e operações autorizadas sobre ocorrências.
- Exportação local em CSV para perfis autorizados.
- Administração municipal de acessos, status, zonas de risco e abrigos por perfis autorizados.

Os módulos legados de estoque/recursos, equipes e telemetria, voluntários e a página antiga de abrigos estão desabilitados. O catálogo público de abrigos após o registro e a administração municipal de abrigos são fluxos distintos e permanecem descritos como ativos.

## Referência e limites

O guia se refere ao escopo GeoAlerta Core 0.1.0 na linha estável `geo-alerta-0-1-0`. Isso identifica a linha de trabalho; não afirma publicação de uma release nem aceite integrado final. A Task 20 está pausada e a Task 30 permanece em andamento. A trilha de auditoria ainda não integra o conjunto final documentado.

O PRD e os requisitos são especificações de produto, não comprovação de funcionamento. Consulte o inventário de páginas e a revisão de estabilidade para estados conhecidos, evidências locais e limitações de integração. Não use este repositório como confirmação do estado de produção.
