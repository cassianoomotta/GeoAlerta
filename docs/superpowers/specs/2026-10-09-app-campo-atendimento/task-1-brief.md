# História: App de campo para assumir e atender ocorrências

**Raia:** To-do / não iniciada  
**Release:** a definir  
**Natureza:** história de produto  
**Plataformas:** React Native para iOS e Android  
**Dependências:** autenticação e autorização Core, ocorrências, grupos, transições de status, histórico de atendimento, painel `/painel` e alertas em tempo real existentes

## História do usuário

Como agente autorizado em campo, quero receber ocorrências despachadas pela sala de comando, assumir um atendimento e consultar os dados operacionais e o endereço, para executar a resposta no local enquanto a sala acompanha minha posição atual.

## Objetivo e escopo

- Criar um app React Native para iOS e Android destinado às equipes de campo. O app recebe ocorrências registradas pelo fluxo atual do cidadão; não substitui nem altera esse formulário.
- Permitir que a sala de comando, nos painéis existentes, faça a triagem e despache uma ocorrência para atendimento. O despacho é disponibilizado aos agentes autorizados no grupo da ocorrência.
- Permitir que um agente autorizado assuma a ocorrência como responsável principal. Uma sala de comando pode adicionar reforços ao atendimento.
- Apresentar no app os dados necessários ao atendimento, incluindo protocolo, tipo, descrição, endereço, localização da ocorrência, prioridade, status e informações de triagem já disponíveis. Nome e contato do cidadão obedecem à permissão `privateData` existente.
- Compartilhar com a sala de comando a localização atual do aparelho em segundo plano enquanto o agente estiver em atendimento, com precisão e horário da leitura. A localização não cria histórico de trajetos.
- Manter todos os painéis web atuais e permitir que continuem exibindo e operando suas funções. O mapa da sala de comando também apresenta a posição atual do agente, quando disponível.
- Suportar consulta dos dados já carregados e registro offline de ações de atendimento. As ações pendentes sincronizam quando a conexão voltar.

## Decisões aprovadas

- O app é voltado aos agentes de campo; o cidadão continua registrando ocorrências pelo fluxo atual.
- A implementação será um app React Native integrado às APIs autenticadas do Core. O app não acessará as tabelas do banco diretamente.
- Operadores, gestores e administradores autorizados no grupo podem despachar uma ocorrência pelo painel da sala de comando.
- Qualquer agente autorizado no escopo do grupo pode assumir uma ocorrência despachada. A primeira assunção válida define um responsável principal; a sala de comando adiciona reforços.
- O despacho é um registro operacional separado do status Core. A ocorrência permanece `EM_TRIAGEM` enquanto aguarda aceite; ao ser assumida, passa para `EM_ATENDIMENTO` pelo fluxo de transição autorizado existente.
- Um novo despacho gera notificação push no app, inclusive quando ele estiver fechado. Os alertas e o mapa atuais da plataforma continuam disponíveis.
- A localização é compartilhada em segundo plano durante o atendimento e deixa de ser compartilhada quando o atendimento termina, é cancelado ou a sessão do agente é encerrada. A sala de comando vê a posição atual, a precisão e o horário da última leitura, sem trilha histórica.
- Negar ou revogar a permissão de localização não bloqueia o uso do app nem o atendimento. O app e o painel deixam claro que a posição está indisponível ou desatualizada; uma leitura antiga nunca é apresentada como atual.
- Sem conexão, o agente pode consultar os dados já carregados e registrar ações de atendimento numa fila local. O app sincroniza essas ações uma só vez ao reconectar e informa conflitos que exijam revisão.
- Não reativar os módulos legados de equipes, voluntários ou recursos como parte desta história. O despacho e a elegibilidade usam os grupos e as permissões Core existentes.
- Não alterar a classificação automática de prioridade ou risco, o formulário do cidadão, a exportação CSV ou outros fluxos dos painéis.

## Fluxo operacional

1. O cidadão registra uma ocorrência pelo processo existente, incluindo a geolocalização obrigatória do dispositivo. A validação geográfica e a triagem atuais continuam sendo aplicadas.
2. Um operador, gestor ou administrador com acesso ao grupo abre a ocorrência no painel, conclui ou atualiza a triagem e envia o despacho.
3. O servidor registra o despacho no escopo autorizado, disponibiliza a ocorrência à fila de campo do grupo e envia a notificação push. O feed in-app e o mapa web permanecem acessíveis na sala de comando.
4. Um agente autenticado e autorizado abre a ocorrência no app, consulta o endereço e os dados operacionais e escolhe assumir. O servidor confirma a assunção atomicamente; se outro agente já a assumiu, o app atualiza o item e não cria uma segunda atribuição principal.
5. A assunção inicia o atendimento segundo a transição autorizada para `EM_ATENDIMENTO`. A sala de comando pode adicionar agentes de reforço; essa ação não substitui o responsável principal nem apaga o histórico.
6. Durante o atendimento, o app envia a posição atual em segundo plano e apresenta ao agente o estado da permissão, da conexão e do último envio. O painel mostra posição, precisão e horário ou um estado indisponível/desatualizado.
7. O agente registra providências no histórico existente. Se estiver offline, os registros ficam pendentes localmente, com identificador idempotente e ordem de criação, e são enviados quando a conexão voltar.
8. Ao encerrar ou cancelar o atendimento pela transição permitida, ou ao encerrar a sessão, o app interrompe o compartilhamento. Nenhuma posição anterior permanece apresentada como posição ao vivo.

## Contratos e regras de acesso

- Exigir sessão ativa e perfil Core ativo para entrar no app. As APIs validam cada ação no servidor conforme município, grupo e capacidade; esconder controles no cliente não substitui autorização.
- Leitura de ocorrências, despacho, assunção, reforços, providências e posição respeitam o escopo de grupo autorizado.
- A sala de comando pode despachar com os perfis `OPERADOR`, `GESTOR` ou `ADMINISTRADOR` que tenham acesso ao grupo da ocorrência. Agentes de campo também precisam estar autorizados no grupo para assumir.
- Apenas uma assunção principal pode vencer para um despacho ativo. A operação deve ser atômica, segura para repetição e auditada com o ator autenticado e horário do servidor.
- A posição enviada pelo dispositivo contém coordenadas, precisão e instante da leitura. O servidor valida sessão e escopo; o cliente não escolhe o autor nem o horário de recebimento.
- Expor somente a posição mais recente do atendimento ativo. Não enviar posição ou dados privados do cidadão em notificações push; a notificação direciona o agente autenticado ao detalhe autorizado.
- Dados operacionais mantidos offline ficam protegidos no dispositivo, limitados às ocorrências carregadas e removidos ao encerrar a sessão. A fila de ações preserva autoria da sessão e não aceita sobrescrever silenciosamente uma transição ou providência conflitante.
- Localização sem permissão, sinal GPS indisponível, conexão interrompida, token expirado ou sessão revogada são estados visíveis e tratados sem inventar coordenadas ou confirmar uma sincronização que não ocorreu.

## Critérios de aceite

- [ ] O app instala e executa em iOS e Android e autentica agentes pelo fluxo Core suportado.
- [ ] Cidadãos continuam abrindo ocorrências pelo formulário atual e os painéis web continuam acessíveis e operacionais.
- [ ] Um `OPERADOR`, `GESTOR` ou `ADMINISTRADOR` autorizado no grupo consegue despachar uma ocorrência triada; usuário fora do grupo não consegue despachar nem consultar seus dados.
- [ ] O despacho fica registrado e aparece na fila de campo do grupo, sem criar um status paralelo ao ciclo Core. A ocorrência não assumida permanece `EM_TRIAGEM`.
- [ ] O app recebe push para um novo despacho mesmo fechado. Push e tela bloqueada não expõem nome, contato ou descrição privada do cidadão.
- [ ] Um agente autorizado vê protocolo, endereço e demais informações permitidas e consegue assumir a ocorrência.
- [ ] Duas assunções concorrentes resultam em exatamente um responsável principal; a outra sessão recebe atualização clara e não duplica transição, evento ou providência.
- [ ] O aceite inicia `EM_ATENDIMENTO` por uma transição Core permitida e fica registrado com ator e horário auditáveis.
- [ ] Um agente sem autorização para o grupo não vê o despacho nem assume a ocorrência por chamada direta à API.
- [ ] A sala de comando adiciona um ou mais reforços sem substituir o responsável principal e sem perder a trilha de auditoria.
- [ ] Com permissão concedida, a posição do agente é atualizada na sala de comando enquanto ele está em atendimento, inclusive com o app em segundo plano; a visualização mostra precisão e horário da última leitura.
- [ ] Com localização negada ou revogada, o agente continua usando o app e atendendo. Tanto app quanto painel informam posição indisponível ou desatualizada e não apresentam uma posição antiga como atual.
- [ ] Ao resolver/cancelar o atendimento ou encerrar a sessão, o app para de enviar localização e o painel deixa de apresentar uma posição ao vivo para aquele atendimento.
- [ ] A posição de um agente de outro município/grupo não pode ser lida por sessão fora do escopo; a localização não é adicionada ao histórico de trajetos.
- [ ] Sem internet, dados da ocorrência previamente carregada permanecem consultáveis e providências/ações ficam identificadas como pendentes, sem confirmação falsa de gravação.
- [ ] Após reconectar, ações offline são sincronizadas na ordem e uma única vez. Se status ou dados conflitarem com uma mudança feita na sala de comando, o app mostra o conflito e preserva a decisão do servidor e a auditoria, sem sobrescrita silenciosa.
- [ ] Logout, expiração ou revogação da sessão impede novas ações e limpa os dados offline protegidos da sessão.
- [ ] A leitura de dados pessoais no app continua sujeita a `privateData`, e notificações, logs, fila de localização e feed Realtime não ampliam essa exposição.
- [ ] Nenhuma mudança introduz despacho automático, atribuição automática de agente, prioridade automática nova ou rastreamento de trajeto.

## Cenários reproduzíveis

Usar sessões, grupos, ocorrências, posições e providências sintéticos. Simular push, localização e conexão sem depender de um provedor remoto na suíte automatizada.

### 1. Despacho autorizado

- **Dado** uma ocorrência `EM_TRIAGEM` no grupo A e um `OPERADOR` ativo autorizado no grupo A
- **Quando** o operador despacha a ocorrência
- **Então** o despacho é registrado no grupo A, permanece separado do status Core, aparece para os agentes elegíveis e gera push sem dados privados

### 2. Despacho negado fora do grupo

- **Dado** uma ocorrência do grupo A e um operador autorizado apenas no grupo B
- **Quando** tenta despachar ou consultar a ocorrência por tela ou API
- **Então** recebe a resposta neutra de acesso negado/não encontrado já adotada pelo Core e nenhum dado da ocorrência é exposto

### 3. Assunção concorrente

- **Dado** um despacho disponível no grupo A e dois agentes autorizados
- **Quando** ambos tentam assumir ao mesmo tempo
- **Então** uma única transação define o agente principal e inicia `EM_ATENDIMENTO`; o outro recebe o estado atualizado, sem eventos duplicados

### 4. Reforço solicitado pela sala de comando

- **Dado** uma ocorrência assumida pelo agente A
- **Quando** a sala adiciona os agentes B e C como reforço
- **Então** A continua como responsável principal, B e C aparecem como reforços e cada mudança fica auditada

### 5. Posição em segundo plano

- **Dado** um agente com atendimento ativo e permissão de localização em segundo plano
- **Quando** o app é minimizado e uma nova leitura válida chega
- **Então** a sala de comando apresenta a coordenada, precisão e horário atuais; nenhuma posição é exposta a grupo não autorizado

### 6. Permissão negada ou revogada

- **Dado** um agente atendendo uma ocorrência com localização negada, revogada ou indisponível pelo sistema operacional
- **Quando** abre o app ou a sala de comando consulta o mapa
- **Então** o agente continua podendo interagir com a ocorrência e registrar atendimento; ambos os lados indicam localização indisponível/desatualizada sem coordenada inventada

### 7. Offline e sincronização idempotente

- **Dado** um atendimento carregado e sem rede, com duas providências registradas localmente
- **Quando** a conexão retorna e o app repete uma requisição após uma resposta incerta
- **Então** as duas providências chegam uma única vez e na ordem original, com ator e horário corretos

### 8. Conflito durante período offline

- **Dado** uma ação de campo pendente e uma transição incompatível já realizada no painel
- **Quando** o app reconecta e tenta sincronizar
- **Então** a ação conflitante é apresentada para revisão, sem reabrir ou sobrescrever a ocorrência automaticamente

### 9. Encerramento e término do rastreamento

- **Dado** um agente com posição compartilhada durante `EM_ATENDIMENTO`
- **Quando** uma transição autorizada resolve/cancela a ocorrência ou a sessão termina
- **Então** o app interrompe o envio e o painel deixa de indicar posição ao vivo daquele atendimento

### 10. Privacidade e dados offline

- **Dado** respostas com sentinelas sintéticas para nome, contato e descrição privada
- **Quando** um perfil sem `privateData` recebe push, carrega detalhes ou mantém cache offline
- **Então** as sentinelas não aparecem na resposta, na notificação, no feed Realtime ou no armazenamento protegido acessível à sessão

## Definition of Done

- [ ] Contratos de despacho, assunção, reforço, presença/posição e fila offline estão documentados e validados entre app, APIs e painel.
- [ ] Autorização de grupo, transições Core, assunção concorrente e auditoria possuem cobertura de domínio, API e banco.
- [ ] Fluxo de notificações push foi testado com doubles; nenhuma suíte automatizada depende de APNs/FCM ou credencial real.
- [ ] Localização em primeiro e segundo plano foi verificada em iOS e Android, incluindo permissão negada/revogada, app minimizado, sessão encerrada, sem GPS e posição desatualizada.
- [ ] Fila offline, armazenamento protegido, reenvio idempotente, ordenação e conflitos foram verificados sem usar dados pessoais reais.
- [ ] Os painéis atuais e o formulário do cidadão têm regressão verificada.
- [ ] TypeScript, lint direcionado e suítes relevantes passam; comandos e limitações ficam registrados em `docs/releases/core/testing/results/`.
- [ ] Variáveis locais ficam somente no `.env` da raiz. Não se executam `git commit`, `git push`, `git merge`, aplicação de migration remota ou deploy pela IA.

## Fora de escopo

- Substituir ou redesenhar o formulário do cidadão e os painéis atuais.
- Despachar ou atribuir agentes automaticamente.
- Reativar ou reconstruir gestão de equipes, voluntários, recursos ou módulos legados.
- Registrar rota ou histórico de trajetos do agente.
- Alterar prioridade automática, classificação de risco ou validação geográfica já existente.
- Sincronizar bidirecionalmente com planilhas ou depender de rede durante a suíte automatizada.
