# GeoAlerta — Design system

Versão 1.1 · 06/10/2026 · **Base visual integrada à interface ativa; evoluções funcionais e cartografia escura pendentes.**

## Adoção na aplicação

A implementação local integra as cores e seus estados com `scripts/generate-design-tokens.mjs`, `src/styles/tokens.css` e Tailwind 3. Claro é o padrão. Claro/Escuro/Sistema são selecionáveis no login, cabeçalho desktop, menu mobile, perfil e catálogo; a preferência fica somente no navegador e é aplicada antes da primeira pintura. Sem armazenamento disponível, a troca continua funcionando durante a sessão.

A base reutilizável em `src/components/ui/` inclui `Button`, `Field`, `Badge`, `InlineNotice`, `PageHeader`, `EmptyState` e `Skeleton`. `PriorityBadge` e `StatusBadge` pertencem à feature de ocorrências. O catálogo público `/design-system` apresenta exemplos fictícios sem operar dados. O shell do painel usa superfícies sólidas, sidebar de 224 px, navegação móvel e diálogo nativo com foco contido e Escape.

Login, perfil, formulário público, lista, detalhe, administração e abrigos usam a paleta semântica. Lista, detalhe, mapa e centro de alertas separam prioridade de situação. Os rótulos configurados são mantidos; as marcas institucionais permanecem em placas brancas. O mapa recebe legenda, forma triangular para prioridade alta, popups temáticos e acesso à lista equivalente.

**Limites:** os tiles continuam no OpenStreetMap claro, inclusive no tema escuro. Um provedor escuro exige decisão de serviço/licença/chave; a alternativa CARTO consultada exige chave de API conforme sua [documentação oficial](https://github.com/CartoDB/basemap-styles). Não se aplicam filtros CSS aos tiles. A migração não implementa novas regras de conflito, coordenação de filas, sincronização de preferências por conta, densidade compacta, nem componentes de módulos legados/desabilitados. As diretrizes abaixo que descrevem essas evoluções continuam sendo requisitos futuros.

## Objetivo e escopo

Uma interface clean e soft para cidadãos que registram ocorrências e gestores que passam horas acompanhando um evento climático. O sistema deve facilitar leitura, triagem e recuperação de erros, com pouco ruído visual e atenção proporcional ao risco.

Este documento define identidade, tokens, componentes, estados, navegação, mapas, responsividade, linguagem e critérios de validação. É um design system de interface; a arquitetura de serviços e banco permanece nos documentos da release Core.

O briefing explícito pede modernidade, suavidade e uso prolongado. Adota-se como hipótese de projeto o tema claro como padrão, acompanhado de tema escuro opcional. A preferência final e o conforto precisam ser avaliados com operadores, monitores e iluminação reais; uma paleta não garante ausência de fadiga.

## Base verificada no projeto

- A marca institucional usa azul profundo, branco mineral e petróleo em `docs/brand/identidade-visual.md`. Sua aplicação em comunicação permanece válida.
- Antes desta integração, a interface combinava painel escuro e formulário público claro. O guia `Core/DESIGN.md` documenta a linguagem anterior, com brilhos e acentos intensos.
- O registro modular habilita mapa e ocorrências; recursos, equipes e voluntários permanecem desabilitados. Há fluxos de administração e catálogo público de abrigos.
- Prioridades de ocorrência: `NORMAL` e `ALTA`. Estados: `NOVA`, `EM_TRIAGEM`, `EM_ATENDIMENTO`, `RESOLVIDA` e `CANCELADA`. Rótulos e transições podem ser configurados.
- Papéis: Consulta, Operador, Gestor e Administrador; o acesso também depende de município, grupo e situação da conta.
- O cidadão deve fornecer GPS nativo; ocorrências em manchas ativas recebem prioridade alta. Alertas são in-app. Exportação é CSV local.

O design não acrescenta prioridades “média” ou “crítica”, não habilita módulos e não modifica regras de autorização.

## Direção visual

**Calma na superfície; precisão na informação; urgência localizada.**

A composição usa fundos minerais, superfícies sólidas, texto azul acinzentado e petróleo para ações. Vermelho aparece em prioridade alta, falha e ações destrutivas, sempre acompanhado de rótulo e ícone que esclarecem o significado.

Preferir divisórias leves e agrupamento por espaço. Evitar brilhos, glassmorphism, gradientes decorativos, grandes áreas saturadas, animações contínuas e fotografias de crise como decoração. A assinatura é tipográfica: **GeoAlerta**. Logotipos institucionais preservam cores e proporções oficiais.

Alternativas consideradas: manter o escuro atual exigiria reduzir brilhos e reorganizar estados; usar petróleo em grandes superfícies competiria com o mapa. Recomenda-se a base mineral, que preserva a identidade institucional e deixa a informação dominar. Escuro suave atende outra condição de iluminação, por escolha do usuário.

## Paleta clara

| Papel / token | Cor | Aplicação |
| --- | --- | --- |
| `background` | `#F5F7F6` | Fundo mineral da aplicação |
| `surface` | `#FFFFFF` | Conteúdo, formulário e painel de detalhe |
| `surface-subtle` | `#EDF2F0` | Navegação, cabeçalhos e regiões auxiliares |
| `text` | `#243746` | Títulos, valores e texto principal |
| `text-muted` | `#536671` | Metadados, dicas e placeholders |
| `border` | `#D8E1DD` | Separação decorativa; não delimita controles sozinha |
| `control-border` | `#7B8B86` | Contorno necessário para identificar inputs |
| `primary` / `focus` | `#087580` | Ação principal, links e foco |
| `primary-hover` | `#06616A` | Hover da ação principal |
| `primary-active` | `#054F57` | Pressionado |
| `primary-soft` | `#E6F2F2` | Seleção discreta e ação secundária |
| `danger` / `danger-soft` | `#A83F3F` / `#FBECEC` | Prioridade alta, erro e exclusão, com rótulos distintos |
| `warning` / `warning-soft` | `#875B17` / `#FAF1DD` | Atenção, triagem e conexão degradada |
| `success` / `success-soft` | `#28664C` / `#E8F3EC` | Confirmação e ocorrência resolvida |
| `info` / `info-soft` | `#315E89` / `#EAF1F8` | Em atendimento e informação |
| `disabled` / `disabled-text` | `#EDF2F0` / `#536671` | Controle indisponível, com motivo visível |

O petróleo operacional é um pouco mais escuro que o `#087F8C` institucional para permitir texto branco pequeno nos botões. O laranja institucional fica nos materiais de comunicação; no app, atenção usa o par âmbar acima. Não usar verde como sinônimo de “território seguro”: ele indica uma ação confirmada ou um estado resolvido.

## Tema escuro suave

| Token | Cor |
| --- | --- |
| `background` | `#172321` |
| `surface` | `#1E2D29` |
| `surface-subtle` | `#253832` |
| `text` | `#E6EEEB` |
| `text-muted` | `#A6B9B2` |
| `border` | `#3D554B` |
| `control-border` | `#7B9186` |
| `primary` / `focus` | `#69B8BD` |
| `primary-hover` / `primary-active` | `#7FC6CB` / `#5AA8AE` |
| `primary-foreground` | `#142523` |
| `primary-soft` | `#213F3E` |
| `danger` / `danger-soft` | `#EFADAD` / `#392526` |
| `warning` / `warning-soft` | `#E1C183` / `#352E21` |
| `success` / `success-soft` | `#94C4A6` / `#20352B` |
| `info` / `info-soft` | `#AAC8EA` / `#223140` |
| `disabled` / `disabled-text` | `#253832` / `#A6B9B2` |

A interface oferece Claro, Escuro e Sistema no perfil e nas superfícies de acesso. Sem preferência anterior, usar Claro; Sistema segue a aparência do dispositivo somente quando selecionado. Persistir apenas a preferência visual local e aplicar antes da primeira pintura. Sincronização entre contas/dispositivos é evolução, pois o contrato atual de preferências não inclui tema. Não trocar automaticamente durante o turno.

Os controles nativos usam `color-scheme` correspondente ao tema. Popups, gavetas e mapa devem acompanhar a escolha; evitar mapa branco brilhante no painel escuro. Não escurecer tiles com filtros CSS, pois isso pode alterar o significado das cores cartográficas.

## Contraste e acessibilidade

Meta proposta: WCAG 2.2 AA na interface implementada. Combinações foram calculadas com luminância relativa sRGB, sem opacidade; o relatório `contrast-report.json` é a evidência numérica. Isso não representa auditoria de acessibilidade das telas atuais.

| Combinação clara | Contraste aproximado |
| --- | --- |
| Texto principal / fundo mineral | 11,41:1 |
| Texto secundário / superfície branca | 5,99:1 |
| Branco / petróleo | 5,43:1 |
| Petróleo / seleção suave | 4,75:1 |
| Vermelho / fundo vermelho suave | 5,31:1 |
| Âmbar / fundo âmbar suave | 5,28:1 |
| Verde / fundo verde suave | 5,97:1 |
| Azul / fundo azul suave | 5,96:1 |
| Contorno de input / fundo mineral | 3,32:1 |

Texto normal e placeholder: pelo menos 4,5:1; texto grande: 3:1; limites e indicadores essenciais de controles: 3:1. Nunca usar o token de borda decorativa como texto ou como único contorno de um input. Cor sempre vem com texto, ícone ou forma. Links em prosa têm sublinhado; foco é visível e não fica sob barras fixas.

Produto deve funcionar por teclado, com leitor de tela, zoom de 200% e reflow a 320 CSS px. Tabelas e mapas podem ter navegação própria quando sua natureza exige duas dimensões; oferecer lista equivalente ao mapa. Não alegar conformidade apenas por passar contraste.

Referências: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) e [uso de cor](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## Tipografia

Família: `"Helvetica Neue", Arial, sans-serif`, em continuidade com a marca e sem download externo obrigatório. Pesos 400 para leitura, 500 para ações e 600 para títulos. Se a família mudar, revisar diacríticos, larguras e quebras.

| Uso | Tamanho / altura de linha | Peso |
| --- | --- | --- |
| Título de página | 24 / 32 px | 600 |
| Título de seção | 18 / 26 px | 600 |
| Corpo e formulário cidadão | 16 / 24 px | 400 |
| Tabela, botão e label desktop | 14 / 20 px | 400–500 |
| Metadado auxiliar | 13 / 20 px | 400 |
| Legenda dispensável | 12 / 18 px | 400 |

Não reduzir prioridade, erro, protocolo ou ação principal para 12 px. Inputs mobile têm pelo menos 16 px. Números e horários alinhados usam `font-variant-numeric: tabular-nums`. Protocolo pode usar monoespaçada apenas quando facilita sua distinção. Usar maiúsculas e minúsculas naturais; não espalhar letras em rótulos pequenos. Texto corrido limitado a 65–75 caracteres por linha.

## Espaço, forma, densidade e camadas

- Escala de espaços: 4, 8, 12, 16, 20, 24, 32, 40 e 48 px. Distância entre campos: 16–20 px; entre seções: 24–32 px.
- Margens: 16 px mobile, 24 px tablet e 32 px desktop. Alinhamento consistente de título, filtro e tabela.
- Raios: 8 px controles, 12 px painéis, 16 px superfícies móveis. Pílulas apenas para badges curtos.
- Botões/inputs desktop: altura 40 px; toque: 48 px. Ícones 18–20 px, alvos 40/48 px. Não encolher alvo para ganhar densidade.
- Tabela confortável: linha mínima 52 px; compacta: 44 px com o mesmo tamanho de texto. Densidade compacta é preferência opcional, não estado atual implementado.
- Elevação: conteúdo com divisórias; sombra apenas em menus e overlays (`0 8px 24px rgb(23 35 33 / 0.12)`). Evitar borda e sombra pesada simultâneas.
- Camadas propostas: base/mapa 0; controles do mapa 10; cabeçalho 20; menu 30; gaveta 40; modal 50; aviso flutuante 60. Manter o isolamento já existente do Leaflet.

## Iconografia

Lucide React, traço consistente de 1,75–2 px. `MapPin` para localização, `List` para ocorrências, `Bell` para alertas, `TriangleAlert` para atenção, `CircleCheck` para confirmação, `WifiOff` para desconexão, `Download` para CSV. Validar os nomes exportados pela versão instalada antes de integrar.

Ícones decorativos ficam fora da árvore acessível. Ações apenas com ícone têm nome acessível e dica auxiliar; ações importantes têm label visível. Não usar emoji para representar estado operacional. O símbolo da marca não precisa ser um alerta vermelho permanente.

## Prioridade, estado e severidade de mensagem

São três dimensões separadas. Uma ocorrência pode ter **Prioridade alta + Em atendimento**; uma falha de conexão é estado do sistema, não prioridade da ocorrência.

| Valor do domínio | Apresentação recomendada | Cor e redundância |
| --- | --- | --- |
| `NORMAL` | Prioridade normal | Neutro, texto explícito |
| `ALTA` | Prioridade alta | Vermelho suave + ícone de atenção + texto |
| `NOVA` | Nova | Neutro + marcador de novo registro |
| `EM_TRIAGEM` | Em triagem | Âmbar suave + ícone de análise |
| `EM_ATENDIMENTO` | Em atendimento | Azul suave + ícone de atividade |
| `RESOLVIDA` | Resolvida | Verde suave + check |
| `CANCELADA` | Cancelada | Neutro + ícone de cancelamento |

Consumir o rótulo configurado pelo município para cada código; os textos da tabela são padrões sugeridos. Não inventar sequência rígida: disponibilizar apenas transições autorizadas. Mostrar prioridade e situação em colunas ou badges separados, sem pintar a linha inteira.

## Catálogo de componentes

| Componente proposto | Contrato e comportamento |
| --- | --- |
| `AppShell` | Nome, município, navegação habilitada, alertas e perfil; área principal com link de pular navegação |
| `PageHeader` | Título, contexto e uma ação dominante; ações auxiliares discretas |
| `Button` | Primário, secundário, texto e destrutivo; tamanhos 40/48 px; nome de ação específico |
| `IconButton` | Alvo 40/48 px, nome acessível; estados iguais ao botão |
| `Field` | Label, input, dica, erro e obrigatório; IDs e associações consistentes |
| `Select` / `Checkbox` / `Radio` | Controles nativos quando possível; grupo com legenda e seleção textual |
| `StatusBadge` | Código do domínio + label configurado; ícone/label e par semântico |
| `PriorityBadge` | Normal/Alta; nunca deriva da situação de atendimento |
| `InlineNotice` | Informação, atenção, sucesso ou erro; recuperação visível quando necessária |
| `ConnectionStatus` | Conectado, reconectando ou indisponível, acompanhado da última atualização confirmada |
| `NotificationCenter` | Novos alertas, contagem, prioridade, situação, horário e link para ocorrência |
| `FilterBar` | Filtros principais à vista; adicionais expansíveis, contagem aplicada e limpar filtros |
| `DataTable` | Colunas configuráveis, ordenação, paginação, estado vazio e seleção explicitamente indicada |
| `OccurrenceSummary` | Protocolo, tipo, prioridade, situação, grupo e horário |
| `OccurrenceDetail` | Resumo, localização, descrição, dados autorizados, foto, ações e histórico |
| `MapLegend` / `MapMarker` | Legenda visível, forma/ícone e cor redundantes; seleção por contorno e descrição |
| `Drawer` | Detalhe contextual; título, fechar, foco gerido e acesso à página completa |
| `Dialog` | Apenas exclusão/cancelamento sensível ou confirmação necessária; motivo e ação específica |
| `Skeleton` / `EmptyState` | Estrutura preservada no carregamento; estado vazio explica causa e próximo passo |
| `Toast` | Confirmação breve, nunca único lugar de um erro ou alerta importante |

### Estados de interação

Padrão: contorno/superfície estáveis. Hover: leve mudança de superfície ou token próprio, sem deslocar layout. Focus-visible: anel de 2 px, offset de 2 px, contraste adequado. Active: token pressionado. Selecionado: preenchimento suave + label/ícone e atributo de estado. Disabled: atributo nativo e motivo associado, sem depender só de opacidade. Loading: preservar largura e nomear “Salvando…” ou “Enviando…”, bloqueando repetição.

Erro de campo: label, contorno danger e mensagem associada com `aria-describedby` e `aria-invalid`. O estado read-only mantém legibilidade e permite selecionar/copiar dados. A indisponibilidade por permissão deve ser explicada quando útil; ações sem autorização não são habilitadas visualmente.

## Arquitetura de informação

### Cidadão — `/`

Conteúdo em coluna de até 560 px: objetivo do registro; tipo; descrição; contato; localização obrigatória; foto opcional; enviar. Preservar campos e validações atuais; a ordem exata pode ser ajustada após teste do fluxo.

Localização usa estados claros: “Obter minha localização”, “Obtendo localização…”, “Localização obtida · precisão aproximada de X m”, permissão negada, indisponível e tempo esgotado. Não chamar GPS de exato nem ocultar sua precisão. Sem coordenadas nativas válidas, explicar por que o envio está bloqueado e oferecer tentar novamente. Não substituir GPS por endereço digitado.

Confirmação: protocolo copiável, estado recebido e orientação objetiva. Confirmar só após resposta do servidor; não prometer equipe a caminho. Foto falhou: explicar e permitir recuperação ou envio sem foto conforme contrato existente. Resposta incerta: manter dados e possibilidade de reenviar sem duplicar o pedido. Catálogo público de abrigos é seção secundária, condicionado à disponibilidade real.

### Gestor — `/painel`

Sidebar desktop de 224 px, cabeçalho de aproximadamente 64 px, contexto e filtros do período/área, mapa dominante e lista/detalhe contextual. A configuração proposta pode usar mapa com 60–70% da área útil e detalhe de 320–400 px em telas grandes.

Mostrar no cabeçalho município, recorte e condição da conexão. Contagens correspondem ao recorte consultado e indicam se a visualização está limitada. Nunca mostrar “0 ocorrências” durante carregamento ou falha. Não afirmar que não existe risco quando não há registro.

Menu principal: Mapa de ocorrências e Ocorrências. Administração fica disponível segundo permissão. Perfil e alertas ficam estáveis no cabeçalho. Recursos, equipes e voluntários só entram quando habilitados no registro modular; sua aparência futura herda os mesmos componentes.

### Lista — `/painel/ocorrencias`

Protocolo, tipo, prioridade, situação, grupo e registro são a base de leitura; preservar configurações de colunas autorizadas. Ações: filtros, preferência de colunas, registrar manualmente conforme permissão, CSV e acesso ao detalhe.

Filtros principais em uma faixa; filtros administrativos adicionais expansíveis. Exibir quantidade de filtros, total e página. Ordenação sinalizada com `aria-sort` no cabeçalho. Atualizações não deslocam a linha que o gestor está lendo; oferecer um aviso “Há novas ocorrências” quando incorporar novos itens alteraria a posição. Essa coordenação de atualização é comportamento proposto, não contrato já implementado.

CSV usa label “Baixar CSV” e informa o recorte aplicado. Não usar verde para o botão de exportação: é ação secundária, não sucesso. A exportação não significa sincronização externa.

### Detalhe — `/painel/ocorrencias/[id]`

Hierarquia: protocolo e tipo; prioridade e situação; posição e descrição; dados do cidadão conforme permissão; foto; ações autorizadas; histórico. Cada alteração persistida recebe confirmação. Cancelar, reclassificar e excluir mostram os motivos exigidos pelo domínio. Conflito de edição explica que houve atualização e oferece recarregar; não sobrescreve silenciosamente.

### Administração, perfil, abrigos e legado

- `/login`: formulário simples e claro, erro compreensível, recuperação somente por caminhos realmente existentes.
- `/painel/perfil`: dados, preferências de colunas e, futuramente, aparência/densidade; indicar salvamento pendente e confirmado.
- Administração: tabelas e formulários para usuários, grupos, áreas de risco, rótulos/transições e abrigos; operações sensíveis mostram alvo e consequência.
- Abrigos: label de ocupação com números e capacidade quando disponíveis; não inferir vagas de um dado ausente; publicação respeita o controle já existente.
- `/rastreio`, equipes, recursos e voluntários: regras visuais de extensão. Fluxos legados precisam de validação própria antes de migração ou ativação.

## Cartografia operacional

Usar base cartográfica discreta com ruas e referências suficientes; prover uma alternativa compatível com tema escuro e manter atribuição/licença. A disponibilidade e licença do provedor são decisões de implementação a verificar.

- Normal: marcador neutro azul acinzentado, circular, com ícone de tipo e rótulo em tooltip/popup acessível.
- Alta: marcador vermelho, com ícone de atenção e forma distinguível; pequena área saturada, contorno de superfície para separação do tile.
- Seleção: anel petróleo e indicação textual; não modificar a cor que identifica prioridade.
- Mancha ativa: contorno vermelho escuro de 2 px, preenchimento vermelho com 12–16% de opacidade; tooltip e legenda com nome e situação. A cor resultante precisa ser testada sobre os tiles reais.
- Mancha inativa: cinza, contorno tracejado, visibilidade secundária e label “Inativa”.
- Cluster: neutro com quantidade; se contém altas, indicador de atenção com contagem explícita. Não usar apenas tamanho para comunicar gravidade.
- Popup: superfície sólida do tema, protocolo, tipo, prioridade, situação e “Abrir ocorrência”; cabe no viewport mobile.

Evitar estados e prioridade competindo por cores no mesmo ponto: o marcador codifica prioridade; situação aparece no popup/lista. Polígonos nunca ocultam ruas e markers. A lista é o caminho equivalente para quem não usa o mapa; foco no mapa não prende a navegação da página.

## Alertas e consciência da operação

Prioridade alta é persistente na ocorrência e no centro de alertas. O alerta não depende de um toast temporário. Informar por que foi classificado, por exemplo “Localização sobreposta a área de risco ativa”, somente quando houver evidência disponível; não fabricar nome da mancha.

Não abrir modal automaticamente a cada ocorrência. Agrupar rajadas por mecanismo já deduplicado, mantendo acesso individual. Abrir o centro de alertas não deve ser apresentado como “atendimento iniciado”: visualização e atendimento são ações diferentes. O contador é de eventos não vistos, não de ocorrências pendentes.

Leitor de tela recebe um resumo em `aria-live="polite"`, sem anunciar cada atualização do mapa. `role="alert"` é reservado a falhas que exigem resposta imediata. Som fica fora do requisito visual do MVP; se vier a existir, precisa de escolha explícita e controle de volume/mute.

## Estados operacionais e mensagens

| Estado | Apresentação e recuperação |
| --- | --- |
| Carregando | Skeleton estático preservando espaço, `aria-busy` e texto de carregamento |
| Nenhum registro | “Nenhuma ocorrência neste período.” + alterar período |
| Filtro sem resultado | “Nenhuma ocorrência corresponde aos filtros.” + limpar filtros |
| Falha inicial | “Não foi possível carregar as ocorrências.” + tentar novamente |
| Conexão perdida | Aviso persistente âmbar, última atualização confirmada e recuperação |
| Reconectando | Preservar conteúdo com label de desatualizado; nunca esconder falha atrás de “ao vivo” |
| Permissão/sessão revogada | Explicar que o acesso mudou; proteger dados e oferecer entrar novamente |
| Mutation falhou | Preservar dados locais e explicar retry; sucesso só após confirmação |
| Conflito de versão | “Esta ocorrência foi atualizada por outra pessoa.” + recarregar |
| GPS negado | “Autorize a localização no navegador e tente novamente.” |
| Dados ausentes | “Não informado”, sem converter ausência em não, zero ou seguro |

A última atualização deve ser a hora confirmada dos dados relevantes, não a hora de abertura da tela. Mostrar horário relativo e completo no detalhe. UI em `pt-BR`; horas operacionais em `America/Sao_Paulo`. Filtros atualmente definidos em UTC precisam manter essa indicação ou ser convertidos de ponta a ponta antes de serem apresentados como locais.

Não prometer uso offline, entrega garantida ou sincronização futura se o fluxo não oferece isso. Permitir leitura de dados já carregados apenas com indicação de atualização e limites de segurança correspondentes.

## Responsividade

| Largura | Organização |
| --- | --- |
| 320–639 px | Uma coluna, controles 48 px, navegação por botão/menu, mapa e lista em alternância; detalhe como página |
| 640–1023 px | Navegação recolhível; filtros em duas colunas; detalhe contextual somente quando couber |
| 1024–1439 px | Sidebar 224 px, mapa e detalhe em divisão; tabela completa com overflow local quando necessário |
| ≥1440 px | Mais espaço para mapa e detalhe; formulários mantêm largura confortável |

Não reduzir texto para encaixar uma tabela. Em mobile, oferecer um resumo por ocorrência com protocolo, tipo, prioridade, situação e abrir detalhe; tabela completa pode continuar disponível com rolagem horizontal contida. Cabeçalho/menu não deve consumir a maior parte da tela. Respeitar safe-area e teclado virtual.

## Movimento e feedback

Transições de cor: 120–160 ms; abrir/fechar gaveta: 180–220 ms; curva ease-out. Não animar todos os elementos na entrada, piscar ocorrências ou mover filas continuamente. Skeleton estático por padrão. Com `prefers-reduced-motion`, retirar movimentos não essenciais. Recentrar mapa é ação do usuário, não reação automática a todo registro.

Confirmações são curtas: “Alteração salva.”, “Ocorrência registrada.” e “Arquivo preparado.” apenas quando verdadeiras. Evitar mensagens genéricas como “Algo deu errado” sem recuperação.

## Organização técnica proposta

O arquivo `tokens.json` é a fonte de cores claras/escuras, dimensões e semântica. `npm run design:tokens` gera o CSS versionado; `npm run design:check` verifica sua consistência. A inicialização do tema também lê esse inventário. Depois de editar tokens, regenerar o CSS e conferir os pares reais de contraste.

A implementação concentra valores de cor no inventário e apresenta aliases semânticos e classes de componentes. Mapear `background`, `foreground`, `card`, `primary`, `muted`, `border`, `input` e `ring` existentes para o novo vocabulário. Acrescentar estados semânticos em vez de distribuir valores hexadecimais pelo JSX.

Componentes genéricos vão em `src/components/ui/`; componentes de ocorrência permanecem na feature. Tokens globais são importados uma vez pelo layout; estilos específicos podem usar CSS Modules, conforme o guia local Next.js consultado. Preservar Tailwind 3 instalado; esta proposta não requer troca de versão ou biblioteca.

O levantamento encontrou `text-white`, `bg-slate-*`, brilhos e cores de estado fixas nas telas. Trocar apenas `:root` deixaria contrastes incorretos: a migração precisa substituir esses valores por papéis semânticos e revisar Leaflet, opções nativas, badges, foco, layout e metadata/theme-color conjuntamente.

## Sequência de aplicação sugerida

1. Validar a direção com operadores: iluminação, leitura de prioridades, densidade e localização das ações.
2. Integrar tokens e tema, componentes de botão/campo/badge/aviso e documentação viva.
3. Migrar shell, login e perfil; validar contraste e navegação.
4. Migrar lista e detalhe; preservar autorização, colunas, filtros, UTC e transições.
5. Migrar mapa e alertas; testar limites do Leaflet, fontes de dados e rajadas.
6. Migrar formulário público e administração; testar GPS, respostas incertas, fotos e abrigos.
7. Extender aos módulos adicionais somente quando fizerem parte do escopo habilitado.

É uma sequência de adoção, não execução já realizada. Não requer alterações em banco, migrações, serviços ou `.env` para definir a aparência. Commits, pushes, merges e deploys continuam exclusivos do usuário.

## Critérios de aceite para a futura implementação

- Cores, estados e dimensões seguem tokens; nenhuma prioridade inexistente é criada.
- Contraste dos pares reais, inclusive hover, seleção, foco, labels e tiles, é conferido em ambos os temas.
- Foco visível, modais/gavetas com retorno de foco, labels, erros associados, anúncio moderado de atualizações e alternativa textual ao mapa.
- Leitura e operação em 320, 390, 768, 1280 e 1440 px; zoom de 200%; textos longos e dados ausentes.
- Teste dos estados GPS, foto, resposta incerta, sessão expirada, conflito, conexão perdida e recorte limitado.
- Ordenação, filtros, CSV, permissões, rótulos configuráveis e idempotência preservados.
- Avaliação com operadores em tarefas representativas e sessão prolongada; registrar dificuldades observadas, sem tratar preferência estética como medida de conforto.

## Entrega e limites da validação inicial

Esta entrega inclui especificação, inventário de tokens, relatório numérico de contraste e prévia interativa ilustrativa. A prévia usa dados fictícios e não opera a plataforma. O cálculo cobre os pares declarados; validação de ergonomia, acessibilidade completa, interação com dados reais e cartografia acontece na implementação e no uso acompanhado.

As referências anteriores e os arquivos de marca/apresentação foram preservados. A entrega inicial foi documental. A adoção visual local descrita no início deste documento altera as telas ativas; seus resultados de verificação ficam em `implementation-validation.md`.
