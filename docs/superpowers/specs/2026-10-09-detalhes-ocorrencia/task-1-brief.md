# História: Simplificar a tela de detalhes da ocorrência

**Raia:** To-do / não iniciada  
**Release:** a definir após a estabilização atual  
**Natureza:** história de produto  
**Referências:** tickets 05 — detalhe autorizado e histórico; 08 — editar e transicionar sem perder alterações

## História do usuário

Como gestor ou operador autorizado, quero consultar e atualizar uma ocorrência em uma tela organizada e compacta, para identificar rapidamente o registro e realizar as ações operacionais sem perder alterações nem comprometer o histórico.

## Objetivo e escopo

- Reorganizar a hierarquia visual do detalhe: destacar protocolo/número e tipo da ocorrência; reduzir para tamanho médio a descrição/detalhes que hoje estão em destaque. O rótulo pequeno e redundante do tipo não precisa ser ampliado.
- Manter Voltar e as ações de ocorrência em uma barra no topo, alinhados no mesmo nível visual. A barra oferece Salvar, os controles de transição de status e Anterior/Próxima.
- Reunir as edições pendentes em um único Salvar: status, prioridade e associação opcional a evento. A interface deve impedir gravação parcial ou descarte silencioso.
- Mostrar prioridade e evento como campos simples, sem criar uma sessão própria para associação. Associar ou remover o evento não exige justificativa do usuário; a ação continua registrada na auditoria conforme as regras do domínio.
- Organizar a tela em duas abas: Dados e Histórico. Dados enviados pelo cidadão ficam somente leitura e agrupados de forma compacta, com espaçamento reduzido. Os campos operacionais editáveis ficam na mesma aba Dados.
- Exibir na aba Histórico os eventos que o usuário já está autorizado a consultar.
- Navegar Anterior/Próxima pelos registros adjacentes da lista atual, preservando filtros e ordenação. Se a tela for aberta fora de uma lista contextual, desabilitar a navegação que não puder ser determinada.
- Ao navegar com alterações pendentes, oferecer salvar, descartar ou cancelar a navegação. Não perder alterações sem uma decisão explícita.
- Manter os contratos de autenticação, autorização por papel/grupo, escopo, transições permitidas, auditoria, controle de versão e conflito concorrente definidos nas histórias 05 e 08.

## Fluxo na tela

1. O usuário autorizado abre o detalhe da ocorrência.
2. O cabeçalho identifica o protocolo/número e o tipo; Voltar, Salvar, controles de status e Anterior/Próxima aparecem na barra superior.
3. Na aba Dados, o usuário consulta os dados de origem em grupos compactos e edita somente os campos operacionais permitidos: prioridade, associação ao evento e status pelas transições válidas.
4. O usuário pode abrir a aba Histórico sem perder os valores editados ainda não salvos.
5. Ao selecionar Salvar, todas as alterações pendentes são submetidas pelo fluxo autorizado e auditado. Sucesso confirma a atualização; falha ou conflito preserva o rascunho e mostra como recuperar o estado atual.
6. Anterior/Próxima navega na lista atual; alterações pendentes são protegidas pelo fluxo de salvar/descartar/cancelar.

## Critérios de aceite

- [ ] Protocolo/número e tipo da ocorrência têm destaque visual consistente; descrição/detalhes passam a tamanho médio e não há ampliação do rótulo pequeno redundante do tipo.
- [ ] Voltar e as ações operacionais aparecem em uma barra no topo, no mesmo nível visual.
- [ ] Um único botão Salvar persiste as alterações pendentes de status, prioridade e evento. A interface impede submissão duplicada e informa carregamento, sucesso e erro.
- [ ] Os controles de status respeitam as transições permitidas, capacidades e escopo existentes. Status pendente só é aplicado ao salvar.
- [ ] Prioridade e evento são editados por campos simples. Associar ou remover evento não pede justificativa ao usuário e continua deixando registro de auditoria.
- [ ] Existem abas Dados e Histórico. A troca de aba preserva o rascunho de edição.
- [ ] Dados enviados pelo cidadão são somente leitura, agrupados por assunto e apresentados com espaçamento vertical reduzido. Campos operacionais editáveis estão na aba Dados.
- [ ] A aba Histórico mostra somente informações e eventos disponíveis ao papel/grupo do usuário, sem expor campos privados ou diferenças restritas.
- [ ] Anterior/Próxima percorre registros adjacentes da lista contextual, preservando filtros e ordenação; controles ficam desabilitados quando não há registro adjacente ou contexto de lista.
- [ ] Navegar com mudanças pendentes permite salvar, descartar ou cancelar; cancelar mantém usuário e valores no registro atual.
- [ ] Erros de validação, falhas de persistência e conflitos de versão não apagam o rascunho nem sobrescrevem silenciosamente alterações concorrentes. O usuário consegue recuperar o estado atual.
- [ ] Acesso direto a registro inexistente ou fora do escopo mantém a resposta/apresentação neutra atual e não revela existência ou conteúdo.
- [ ] A tela pode ser operada por teclado e leitor de tela, mantém foco visível, rótulos acessíveis e layout utilizável em telas menores.

## Testes automatizados obrigatórios

- [ ] Testes de componente verificam a hierarquia visual/semântica, barra superior, abas, estado de leitura dos dados do cidadão, campos operacionais editáveis e estados de carregamento, sucesso e erro.
- [ ] Testes de componente verificam que trocar de aba preserva o rascunho e que a navegação com alterações pendentes oferece salvar, descartar e cancelar sem perda silenciosa.
- [ ] Testes de integração verificam o salvamento conjunto de status, prioridade e evento, incluindo associação e remoção sem justificativa; confirmam que a auditoria é mantida.
- [ ] Testes de integração cobrem transições permitidas e negadas, autorização/escopo, validação, falha sem persistência parcial e conflito de versão sem sobrescrita.
- [ ] Testes E2E cobrem abertura autorizada, visualização dos dados, edição e salvamento, troca entre Dados/Histórico, navegação anterior/próxima com filtros ativos e proteção do rascunho em erro/conflito.
- [ ] Testes de regressão cobrem Voltar, permissões, histórico sanitizado e fluxos existentes de edição/transição.
- [ ] Os testes usam fixtures e doubles determinísticos quando apropriado; a suíte automatizada não depende de serviços externos ou dados pessoais reais.

## Definition of Done

- [ ] Todos os critérios de aceite foram implementados e revisados; mudanças fora do escopo estão justificadas no ticket.
- [ ] Testes unitários/de componente, integração e E2E relevantes foram adicionados à suíte existente e aprovados.
- [ ] TypeScript, lint direcionado e testes relevantes passam; registrar comandos, resultados e limitações em evidência sanitizada.
- [ ] Revisão manual de teclado, leitor de tela e layout responsivo concluída e documentada.
- [ ] Conflitos e falhas preservam o rascunho, evitam gravação parcial e não contornam autorização, escopo ou auditoria.
- [ ] Evidência sanitizada e resumo de implementação/validação foram registrados. Validação local e aceite integrado de serviços reais são descritos separadamente.
- [ ] Variáveis locais permanecem exclusivamente no `.env` da raiz. A IA não executa commit, push, merge, alterações em ambiente compartilhado ou deploy; essas ações cabem ao usuário.

## Dependências e compatibilidade

- Usar como referência os contratos e limites de acesso das histórias 05 — detalhe autorizado e histórico — e 08 — edição e transições.
- Não alterar regras de transição, capacidades, matriz de visibilidade, projeção sanitizada do histórico nem semântica de concorrência sem documentar e testar explicitamente a mudança necessária.
- Antes de qualquer alteração de código Next.js, consultar a documentação pertinente em `node_modules/next/dist/docs/` conforme `AGENTS.md`.

## Fora de escopo

Alterar dados enviados pelo cidadão; introduzir novos estados ou permissões; mudar transições de domínio; ampliar a exposição de dados pessoais ou do histórico; criar navegação global fora do contexto atual da lista; adicionar dependências de interface sem necessidade justificada.
