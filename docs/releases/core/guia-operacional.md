# Guia operacional — GeoAlerta Core

**Referência:** escopo Core 0.1.0, linha estável `geo-alerta-0-1-0`  
**Revisão:** 2026-10-06  
**Público:** cidadãos, operadores, gestores, administradores municipais e mantenedores

Este guia descreve os fluxos atualmente implementados no código revisado. A referência da linha não significa que uma release foi publicada ou que o aceite integrado final foi concluído. A Task 20 permanece pausada; consulte [limites conhecidos](#recursos-pendentes-e-legados) antes de tratar qualquer fluxo como validado em produção.

## Abertura pública de ocorrência

**Perfil:** cidadão, sem necessidade de conta.

**Passos:**

1. Abra a página pública de registro fornecida pelo município.
2. Informe nome, contato, tipo de ocorrência e descrição. O endereço é opcional.
3. Selecione **Obter localização** e permita o acesso à localização do dispositivo. Confirme que a precisão foi apresentada.
4. Se quiser, anexe uma foto JPEG, PNG ou WebP de até 5 MiB.
5. Selecione **Enviar ocorrência** e aguarde a confirmação.

**Resultado esperado:** a tela confirma o registro e apresenta protocolo e status. Guarde o protocolo para referência. Depois da confirmação, a página consulta abrigos ativos e abertos; esse catálogo é complementar ao registro.

**Se houver falha:**

- Sem localização, o envio fica bloqueado. Permita GPS no navegador/dispositivo e tente obter a posição novamente. Em caso de demora, indisponibilidade ou posição inválida, tente de novo ou use outro dispositivo com localização.
- Se os tipos não carregarem, atualize a página antes de tentar enviar.
- Se o envio ficar sem confirmação, tente novamente com os mesmos dados. A tentativa usa uma chave de idempotência para evitar duplicação.
- Se a foto falhar, escolha entre tentar novamente ou confirmar explicitamente o envio sem foto. A confirmação se aplica aos dados e à foto selecionados; se os dados mudarem, confirme novamente.
- Se a lista de abrigos falhar depois que o protocolo apareceu, a ocorrência continua registrada. Use **Tentar carregar abrigos novamente**.

## Acesso ao painel

**Perfil:** servidor ou integrante com conta ativa e vínculo/grupo autorizado.

**Passos:** abra `/login`, informe o e-mail institucional e a senha fornecida pela administração e selecione **Entrar no Painel**. Não há cadastro público de operadores. Use **Meu perfil** para atualizar os dados pessoais permitidos e encerrar a sessão.

**Resultado esperado:** uma conta autorizada segue para `/painel`. As páginas e APIs verificam a sessão e o escopo autorizado no servidor; ocultar um link na navegação não concede nem remove autorização.

| Perfil | Acesso operacional descrito nesta versão |
|---|---|
| `CONSULTA` | Lê dados permitidos no escopo associado; não recebe dados privados nem executa operações. |
| `OPERADOR` | Lê dados privados autorizados e executa operações permitidas nas ocorrências do seu escopo. |
| `GESTOR` | Tem as capacidades de operação, pode reclassificar ocorrências e exportar CSV. |
| `ADMINISTRADOR` | Tem as capacidades de gestor e administra acessos no escopo municipal autorizado. |

Os dados visíveis dependem do perfil e dos grupos autorizados. Uma pessoa sem grupo ativo (exceto administrador autorizado) não entra no painel.

**Se houver falha:** credenciais inválidas mostram um aviso para corrigir os dados e tentar novamente. Se a conta não estiver autorizada, peça à administração que verifique seu estado, papel e grupo; não tente contornar o bloqueio usando outra URL. Se sua autorização expirar ou for revogada, entre novamente com uma conta autorizada.

## Painel e indicadores

**Perfil:** `CONSULTA`, `OPERADOR`, `GESTOR` ou `ADMINISTRADOR` com acesso ao painel.

**Passos:** abra **Dashboard** na navegação. Use os atalhos de período disponíveis ou escolha um intervalo personalizado para atualizar indicadores e gráficos.

**Resultado esperado:** totais e visualizações refletem ocorrências do período e do escopo que o perfil pode consultar. Os indicadores representam o estado atual das ocorrências incluídas.

**Se houver falha:** aguarde o carregamento terminar. Se a página mostrar erro, tente novamente; não interprete dados de uma consulta anterior como atualização confirmada.

## Mapa de ocorrências

**Perfil:** perfil autenticado com acesso de leitura ao painel.

**Passos:** abra **Mapa**. Defina as datas inicial e final se quiser limitar o período; mova ou aproxime o mapa para delimitar a área. Ative/desative cartões de status e prioridade, abra **Tipos de ocorrência** para buscar e selecionar tipos, ou use **Exibir todos** para restaurar a visualização.

**Resultado esperado:** cada marcador combina ícone do tipo e cor do status; prioridade alta tem indicação visual própria. As contagens correspondem à área e ao período consultados. Se a consulta exceder 1.000 ocorrências, o mapa avisa que mostra até 1.000 marcadores.

**Se houver falha:** use **Tentar novamente**. Se muitos registros corresponderem, refine datas, área, status, prioridade ou tipo. Se todos os filtros forem ocultados, use **Exibir todos**.

## Lista, detalhe e operações de ocorrência

**Perfil:** leitura para perfis autorizados; criação/operação conforme capacidade. A lista e a API limitam resultados ao município/grupo autorizado.

**Passos para localizar um registro:**

1. Abra **Lista de ocorrências**. A rota antiga `/painel/tabela` redireciona para esta lista.
2. Abra **Filtros da ocorrência**, informe período/status/prioridade/tipo ou outros campos disponíveis e selecione **Aplicar filtros**. Datas são informadas em UTC.
3. Navegue pelas páginas, ordene pelas colunas disponíveis ou ajuste **Preferências de colunas**.
4. Selecione o protocolo para abrir o detalhe.

**Resultado esperado:** a lista informa total e página atual. O detalhe exibe as informações permitidas ao seu perfil e oferece apenas operações autorizadas. Transições de status e alterações operacionais podem depender da regra configurada e da versão atual do registro.

**Se houver falha:** um filtro inválido ou grupo não autorizado apresenta orientação para corrigir os filtros; use **Limpar filtros e tentar novamente**. Se um registro não carregar, ele pode não existir ou estar fora do seu escopo. Em falha de comunicação durante uma alteração, confira o estado atual do registro antes de repetir a operação.

**Criação manual:** perfis com capacidade de operação podem abrir **Nova ocorrência**. Selecione tipo e grupo autorizado, informe nome, contato e descrição, use **Obter localização GPS** e selecione **Registrar ocorrência**. O endereço é opcional. A confirmação apresenta protocolo, prioridade e link para o detalhe. Sem GPS ou grupo autorizado, o registro não pode ser enviado.

## Alertas in-app

**Perfil:** usuário autenticado e autorizado a receber alertas no próprio escopo.

**Passos:** use o botão **Alertas in-app** no painel para abrir a lista. O indicador numérico mostra itens ainda não lidos; selecione um alerta para abrir a ocorrência relacionada.

**Resultado esperado:** ocorrências novas autorizadas aparecem visualmente no painel. O sistema combina a assinatura de eventos com consultas de recuperação e remove duplicatas; não depende de e-mail.

**Se houver falha:** em caso de conexão interrompida, a tela informa que tentará se recuperar; ao reconectar, os alertas recentes podem ser recuperados. Se aparecer aviso de autorização revogada ou sessão ausente, entre novamente. **Nenhum alerta recente** significa que a lista consultada não trouxe eventos recentes para seu escopo.

## Exportação CSV

**Perfil:** `GESTOR` ou `ADMINISTRADOR` autorizado.

**Passos:** na lista, aplique os filtros desejados e selecione **Baixar CSV das ocorrências filtradas**. O navegador baixa um arquivo local com os resultados autorizados correspondentes aos filtros.

**Resultado esperado:** o arquivo contém o conjunto filtrado completo permitido ao perfil, não apenas a página visível. A exportação é local; não sincroniza com planilhas externas.

**Se o botão não estiver disponível ou o download for recusado:** confirme que sua conta tem papel de gestor/administrador e que está ativa. Se a consulta falhar, ajuste os filtros ou peça à administração para verificar seu escopo. Não compartilhe o arquivo fora dos canais autorizados: ele pode conter dados operacionais.

## Administração municipal

**Perfil:** `ADMINISTRADOR` ativo no escopo municipal autorizado.

Em **Administração municipal**, as telas disponíveis permitem administrar acessos, configurar apresentações/transições de status, gerenciar zonas de risco e administrar abrigos. Cada página e operação verifica autorização no servidor. O perfil pessoal continua separado: a própria pessoa pode alterar apenas os dados pessoais permitidos, não o próprio papel, estado ou grupo.

Se uma página administrativa negar acesso, confirme com o responsável municipal que a conta está ativa e tem papel de administrador naquele escopo. A navegação não substitui essa validação.

## Recursos pendentes e legados

- **Auditoria de ações:** a Task 30 está em andamento. A trilha ainda não faz parte do conjunto final documentado; retenção/arquivamento e validação integrada continuam pendentes. Não use esta versão do guia para afirmar disponibilidade ou aceite desse recurso.
- **Aceite integrado da versão:** a Task 20 está pausada. As evidências locais e de homologação já registradas em outros documentos não equivalem ao aceite final de todos os fluxos nem à confirmação do estado de produção.
- **Módulos desativados:** `/painel/abrigos`, `/painel/recursos`, `/painel/equipes`, `/painel/voluntarios` e `/rastreio` exibem a indisponibilidade do legado. O fluxo público de consulta de abrigos após o registro e a administração de abrigos em `/painel/admin/shelters` são recursos separados.
- **Fora do escopo ativo:** integração bidirecional com planilhas, notificações operacionais por e-mail, rastreamento de equipes e estoque/voluntários legados.

## Referências para mantenedores

- [Inventário de páginas, acesso e estados](../../stability/page-inventory.md)
- [Revisão dos fluxos e evidências](../../stability/critical-flow-review.md)
- [Achados e critérios de saída da versão](../../stability/page-stability-findings.md)
- [PRD Core](PRD.md) e [requisitos](requirements.md): especificação de comportamento; consulte este guia e as evidências de estabilidade para distinguir intenção de implementação.

Antes de alterar este guia, confira a interface e as regras atuais. Registre explicitamente as limitações e a validação realmente executada; não inclua credenciais, dados de pessoas, caminhos locais ou instruções de produção.
