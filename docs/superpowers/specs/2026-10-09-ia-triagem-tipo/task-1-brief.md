# História: Sugestão de tipo de ocorrência com IA

**Raia:** To-do / não iniciada  
**Release:** a definir após a estabilização atual  
**Natureza:** história de produto  
**Referência de modelo:** [`~typesafe/jev-latest` no OpenRouter](https://openrouter.ai/~typesafe/jev-latest)

## História do usuário

Como analista de ocorrências, quero receber uma sugestão de tipo baseada na descrição da solicitação, para classificar ocorrências mais rapidamente e manter a decisão final sob meu controle.

## Objetivo e escopo

- Depois que uma nova ocorrência for persistida, iniciar automaticamente sua classificação sem fazer o registro depender da resposta da IA.
- Usar `~typesafe/jev-latest` via OpenRouter para escolher uma categoria do catálogo atual de tipos ativos. Jev é um modelo de decisões tipadas; consultar a documentação vigente e usar a API de decisões, não uma API de geração de texto.
- Enviar ao OpenRouter somente a descrição e as opções de tipos ativos. Não enviar nome, contato, endereço, coordenadas, fotos, protocolo ou outros dados da ocorrência. A chamada e a chave devem permanecer no servidor; a chave local usa exclusivamente `.env` na raiz do repositório.
- Aplicar o limite estrito de confiança: só há sugestão se a confiança for maior que `0.70`. Uma confiança igual a `0.70` não gera sugestão.
- Não mostrar justificativa nem valor de confiança ao analista.
- A sugestão nunca altera o tipo persistido automaticamente. Enquanto estiver pendente, abaixo do limite ou indisponível, o tipo informado no registro permanece intacto.
- O fluxo é visível a todos os analistas que já tenham permissão para operar aquela ocorrência, respeitando o escopo de grupo existente.
- O acompanhamento de redução de tempo será manual; não adicionar instrumentação de tempo ou telemetria de adoção nesta história.

## Fluxo no painel

1. Após salvar o registro, a análise começa em segundo plano.
2. Enquanto a resposta não chega, o detalhe da ocorrência mostra **“Análise pendente”**.
3. Com confiança maior que `0.70` e categoria ainda ativa, mostrar somente o tipo sugerido e **“Aceitar sugestão da IA”**.
4. O aceite preenche o campo de tipo; não salva a ocorrência.
5. O analista pode selecionar outro tipo ativo e então usa **“Salvar edição”** para persistir a decisão pelo fluxo auditado existente.
6. Com confiança igual ou inferior a `0.70`, não mostrar sugestão. Se houver erro, timeout, configuração ausente ou resposta inválida, informar **“Não foi possível gerar a sugestão; classifique manualmente”**. Em ambos os casos, manter a ocorrência e seu tipo atual.

## Contratos e pontos de integração

- Catálogo autorizado: `public.occurrence_types`, considerando somente categorias ativas no momento da análise.
- Fluxo de registro: iniciar classificação apenas depois da persistência da ocorrência; falha do OpenRouter não desfaz nem atrasa a confirmação do registro.
- Detalhe e edição: integrar com o detalhe existente em `src/app/painel/ocorrencias/[id]/page.tsx` e com a edição de tipo existente. Substituir o campo livre por seleção do catálogo ativo; validar novamente no servidor para rejeitar tipo desconhecido/inativo.
- Mutação: aproveitar o fluxo de edição/auditoria existente em `src/features/occurrences/domain/mutation.ts` e `src/server/occurrences/mutate.ts`, adaptando a validação do tipo conforme necessário.
- Segredo: ler `OPENROUTER_API_KEY` somente no servidor, pelo `.env` da raiz. Nunca expor o segredo ao navegador ou incluí-lo em logs, evidências ou fixtures.
- Antes de alterar código Next.js, ler a documentação pertinente em `node_modules/next/dist/docs/` e respeitar os avisos desta versão instalada.

## Critérios de aceite

- [ ] Toda nova ocorrência persistida inicia uma análise da descrição; a resposta da IA não é requisito para concluir o registro.
- [ ] A requisição contém a descrição e a lista de opções ativas necessárias à decisão, sem os outros dados da ocorrência.
- [ ] A resposta só é aceita se escolher uma opção presente no catálogo ativo; opção desconhecida/inativa ou resposta malformada não cria sugestão.
- [ ] O painel exibe “Análise pendente” enquanto aguarda o resultado.
- [ ] Confiança maior que `0.70` gera uma sugestão do catálogo; confiança igual a `0.70` ou menor não gera sugestão.
- [ ] Sugestão pronta exibe somente o tipo e o botão de aceite, sem explicação ou pontuação.
- [ ] Erro do provedor, timeout, ausência de configuração e resposta inválida não impedem o registro; o analista recebe orientação de classificação manual e o tipo atual é preservado.
- [ ] Aceitar a sugestão preenche o campo sem persistir a alteração; a persistência só ocorre após “Salvar edição”.
- [ ] O analista pode trocar a sugestão por qualquer outra categoria ativa permitida e salvar essa escolha.
- [ ] A alteração salva mantém autorização, escopo de grupo, controle de versão e auditoria do fluxo de edição atual.
- [ ] O formulário público continua registrando ocorrência com o comportamento e o tipo escolhidos pelo cidadão mesmo com a IA indisponível.
- [ ] Nenhuma classificação automática de prioridade, risco, equipe ou encaminhamento é introduzida.
- [ ] Nenhum dado pessoal real é usado em testes, amostras enviadas ao provedor ou evidências.

## Definition of Done

- [ ] Contrato do cliente Jev validado na documentação atual do OpenRouter, inclusive formato da resposta de escolha e obtenção da confiança.
- [ ] Testes unitários, de API e de navegador cobrem os cenários desta história com respostas fixture/doubles determinísticas; a suíte normal não depende de rede nem de disponibilidade do OpenRouter.
- [ ] Os testes verificam que o tipo original não muda antes de salvar e que a edição manual usa o catálogo ativo e passa pela autorização/auditoria existentes.
- [ ] Testes confirmam que apenas a descrição e as opções de tipo são enviadas ao provedor e que nenhum segredo aparece no cliente ou nos logs.
- [ ] TypeScript, lint direcionado e testes relevantes passam; resultados, comandos e limitações são registrados em `docs/releases/core/testing/results/`.
- [ ] Qualquer smoke test real do OpenRouter usa descrição sintética, não registra credenciais e é documentado separadamente dos testes determinísticos.
- [ ] Evidências não contêm credenciais nem dados pessoais; limites de mocks, doubles e integração real ficam explícitos.
- [ ] Variáveis locais ficam apenas no `.env` da raiz. A IA não executa commit, push, merge, altera ambientes compartilhados ou faz deploy; essas ações cabem ao usuário.

## Cenários de teste reproduzíveis por IA

Todos os testes abaixo usam catálogo, sessão, ocorrência e resposta Jev fixos. O cliente OpenRouter deve ser substituível por um double que devolve a fixture indicada; não chamar o serviço externo na suíte automatizada.

### 1. Sugestão acima do limite

- **Dado** catálogo ativo `Alagamentos/Inundação` e `Incêndio`, ocorrência com tipo atual `Alagamentos/Inundação` e descrição sintética sobre foco de fogo em vegetação
- **E** resposta fixture escolhe `Incêndio` com confiança `0.71`
- **Quando** a análise termina
- **Então** o painel oferece `Incêndio` e o botão de aceite, enquanto o tipo persistido continua `Alagamentos/Inundação`

### 2. Limite exato e confiança abaixo dele

- **Dado** a mesma ocorrência e opções do cenário 1
- **Quando** a resposta fixture retorna confiança `0.70`, e depois `0.69` em execuções independentes
- **Então** nenhuma execução apresenta sugestão e o tipo persistido continua `Alagamentos/Inundação`

### 3. Tipo que não pertence ao catálogo ativo

- **Dado** o catálogo ativo do cenário 1
- **Quando** o provedor retorna `Queda de Árvore` (inativo) ou uma categoria inexistente com confiança `0.99`
- **Então** o resultado é rejeitado, nenhuma sugestão é apresentada e o tipo atual não muda

### 4. Resposta incompleta ou inválida

- **Dado** uma análise pendente
- **Quando** a fixture não inclui escolha, confiança, ou retorna confiança fora do intervalo válido
- **Então** o painel apresenta a mensagem de falha e mantém a ocorrência e seu tipo atual

### 5. Estado pendente e conclusão posterior

- **Dado** uma nova ocorrência salva e uma fixture que ainda não resolveu a chamada
- **Quando** o analista abre o detalhe
- **Então** vê “Análise pendente” e o tipo original; após concluir a chamada com confiança `0.71` e atualizar o detalhe, vê a sugestão sem criar outra ocorrência

### 6. Timeout ou erro do OpenRouter

- **Dado** uma ocorrência já confirmada
- **Quando** o double lança timeout ou retorna erro do provedor
- **Então** o registro continua disponível, o painel informa que não foi possível gerar a sugestão e o tipo original é preservado

### 7. Payload mínimo e proteção de dados

- **Dado** uma ocorrência fixture com sentinelas sintéticas distintas em descrição, nome, contato, endereço, coordenadas, foto e protocolo
- **Quando** o cliente OpenRouter é interceptado
- **Então** a requisição contém somente a descrição e as opções de tipos ativos; nenhuma das outras sentinelas nem a chave de API aparece no payload

### 8. Aceitar sem gravar antes de salvar

- **Dado** uma sugestão fixture `Incêndio` com confiança `0.71`
- **Quando** um analista autorizado seleciona “Aceitar sugestão da IA”
- **Então** o campo de tipo recebe `Incêndio`, mas a ocorrência persistida não muda até “Salvar edição”
- **E quando** o analista salva
- **Então** o detalhe mostra `Incêndio` e a trilha auditada registra ator e alteração anterior/nova

### 9. Correção manual antes de salvar

- **Dado** o campo preenchido pela sugestão `Incêndio`
- **Quando** o analista escolhe `Alagamentos/Inundação` no catálogo ativo e salva
- **Então** a escolha manual é persistida e a sugestão não substitui o valor novamente

### 10. Autorização e escopo

- **Dado** uma ocorrência do grupo A, sessão autorizada no grupo A, sessão apenas do grupo B e perfil sem capacidade de operação
- **Quando** cada sessão abre o detalhe e tenta aceitar/salvar uma sugestão
- **Então** somente a sessão autorizada no grupo A recebe e usa os controles; API rejeita as demais tentativas sem revelar dados fora do escopo

### 11. Regressão do registro público

- **Dado** o OpenRouter sem chave ou indisponível
- **Quando** um cidadão envia uma ocorrência válida pelo fluxo público
- **Então** o protocolo e o tipo escolhido pelo cidadão são persistidos como hoje; a falha da IA não desfaz nem impede o registro

### 12. Repetibilidade do limite

- **Dado** fixtures idênticas com confiança `0.69`, `0.70` e `0.71`
- **Quando** a suíte roda repetidamente
- **Então** os resultados são idênticos: sem sugestão para `0.69` e `0.70`, sugestão para `0.71`

## Fora de escopo

Classificar ocorrências históricas; alterar tipo sem aceite e salvamento do analista; mostrar explicação ou confiança; priorizar ocorrência, identificar risco à vida, atribuir equipe ou encaminhar automaticamente; abertura por WhatsApp; telemetria de tempo ou adoção; app móvel.
