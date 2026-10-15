# Smoke E2E de baixo volume em produção — 2026-10-10

## Escopo e limites

Execução com Playwright Chromium headless em `https://geo-alerta.vercel.app`, usando um contexto limpo sem sessão, em série e sem carga concorrente. As navegações e chamadas foram somente GET. Nenhuma credencial foi enviada; nenhum formulário foi submetido; não houve upload, escrita, exclusão, alteração ou envio de alerta. A localização usada para exercitar a interface era sintética (`-29.8235, -50.5192`, precisão 8 m), fornecida pela API de geolocalização do navegador Playwright.

O volume foi deliberadamente pequeno para preservar cotas do plano gratuito. Não havia acesso ao painel de consumo/billing do provedor, então o saldo exato de cotas não foi consultado.

## Resultado

- Página pública `/`: HTTP 200, formulário renderizado e catálogo de tipos carregado via GET HTTP 200, com 30 opções de tipo.
- GPS: botão de localização aceitou a posição sintética; o botão `Enviar ocorrência` foi habilitado. O envio não foi clicado.
- GET `/api/core/public/shelters`: HTTP 200; resposta continha 2 abrigos. Nomes e outros dados não foram incluídos no registro.
- Página de login `/login`: HTTP 200; formulário renderizado; autenticação não tentada.
- Rota pública `/rastreio`: HTTP 200.
- 22 rotas sob `/painel` foram consultadas individualmente sem seguir redirecionamentos. Todas responderam HTTP 307 para `/login`, como esperado sem sessão:
  - `/painel`, `/painel/mapa`, `/painel/ocorrencias`, `/painel/tabela?status=NOVA`;
  - `/painel/ocorrencias/{id}`, `/painel/ocorrencias/excluidas`, `/painel/ocorrencias/nova`, `/painel/ocorrencias/rapida`, `/painel/perfil`;
  - `/painel/admin`, `/painel/admin/grupos`, `/painel/admin/auditoria`, `/painel/admin/climate-events`, `/painel/admin/risk-zones`, `/painel/admin/status`, `/painel/admin/shelters`, `/painel/admin/shelters/novo`, `/painel/admin/shelters/{id}/editar`;
  - `/painel/abrigos`, `/painel/equipes`, `/painel/recursos`, `/painel/voluntarios`.
- Erros de página JavaScript: 0. Erros de console: 0. Requisições HTTP de escrita observadas: 0.

## O que ficou sem validação ponta a ponta

Sem uma sessão de teste de gestor/administrador e sem registros sintéticos já isolados, não foi possível validar os dados do painel, mapa, lista/detalhes, alertas Realtime, exportação CSV, permissões por papel/grupo, cadastro/edição de abrigos ou zonas, nem o ciclo completo de criação e triagem de ocorrência. Executar essas ações em produção poderia inserir dados operacionais ou disparar alertas reais. O smoke anônimo confirma carregamento público e redirecionamento das rotas protegidas, não o funcionamento interno autenticado.

A suíte Playwright existente continua apontada para servidores e fixtures locais; partes dela criam ou alteram registros de teste. Ela não foi redirecionada para produção. O teste anterior de 90 minutos foi somente GET de baixa frequência e também não mediu capacidade sob carga.

## Conclusão

Os caminhos públicos testados e a barreira de sessão das rotas do painel responderam como esperado. A validação integral autenticada continua pendente de uma sessão e dados de teste isolados em ambiente permitido. Nenhum dado de produção foi alterado por esta execução.
