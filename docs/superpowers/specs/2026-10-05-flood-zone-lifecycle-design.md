# Ciclo de vida das manchas de inundação — História 25

**Status:** proposta aprovada em conversa, aguardando revisão desta especificação escrita.  
**Escopo:** decisão de produto e critérios para implementação futura. Esta história não altera código, esquema ou dados.

## Objetivo

Definir como zonas de inundação e de risco são criadas, ativadas, versionadas, encerradas, arquivadas e consultadas ao longo do tempo, mantendo compatibilidade com a história 17 e explicabilidade das classificações das ocorrências.

## Decisões

### Conceitos e responsabilidade

- Uma zona é a unidade espacial identificada por `zone_id`; cada alteração cria uma versão identificada por `(zone_id, version)`.
- `INUNDACAO` identifica uma mancha de inundação. `RISCO` permanece um tipo distinto. Os tipos compartilham o ciclo de vida e os controles administrativos definidos aqui.
- Somente Administradores autenticados podem criar, ativar, alterar, encerrar ou arquivar zonas.
- A gestão administrativa versionada pertence ao MVP estável. A ampliação da experiência visual de desenho no mapa fica para uma história de implementação posterior, que deve consumir esse mesmo fluxo versionado.
- A mancha visual calculada no navegador não é fonte oficial para classificação nem para consulta histórica.

### Criação, vigência e ativação

- Uma zona nova é criada inativa. A ativação é explícita e registrada em uma nova versão.
- Toda versão tem um início efetivo. `valid_from` é inclusivo; `valid_to` é exclusivo. Um limite final nulo significa vigência sem data final definida.
- A primeira versão pode ter início aberto (nulo), interpretado como anterior a qualquer instante consultável. Versões posteriores precisam de início efetivo explícito, para que a consulta temporal determine quando passam a valer.
- Geometria, tipo, nome, estado e limites de vigência são validados antes da gravação. Intervalos vazios ou invertidos são recusados.
- Uma versão ativa só participa do mapa operacional e da classificação quando é a versão efetiva para o instante corrente e está dentro da vigência.

### Versionamento, encerramento e substituição

- Versões são append-only: uma edição não altera nem remove a geometria já registrada. A gravação de cada versão é atômica com a auditoria de ator, instante, motivo e campos alterados.
- Atualizações informam a versão esperada; uma edição concorrente obsoleta é recusada, sem sobrescrita silenciosa.
- A mesma área lógica mantém o `zone_id` e recebe versão nova. Uma área independente recebe novo `zone_id`. Se uma zona independente substituir outra, a implementação futura deve registrar explicitamente essa relação de substituição e o motivo.
- Encerrar ou arquivar significa criar uma nova versão inativa, com início efetivo definido. Não se apagam zonas nem versões. O arquivo fica fora das camadas operacionais correntes, mas permanece consultável no histórico por Administradores.
- Reativar exige uma nova versão ativa com início efetivo. Isso não altera ocorrências já classificadas.

### Consulta por vigência

- O seletor histórico consulta a situação válida para o instante escolhido, segundo as regras de vigência conhecidas atualmente. Não reconstrói o que o sistema conhecia ou mostrava quando aquele instante ocorreu.
- Para cada `zone_id`, a consulta escolhe a versão efetiva mais recente cujo início seja anterior ou igual ao instante consultado; empate no início é resolvido pela maior versão. Se a versão escolhida estiver inativa ou fora de seu intervalo explícito, a zona não aparece. A consulta não volta a uma versão anterior após o encerramento da versão escolhida.
- Uma versão futura agendada não substitui a versão operacional antes do seu início efetivo.
- A comparação entre duas datas mostra as respectivas geometrias, tipos e estados efetivos, identificando versão e vigência. O acesso exige a mesma autorização administrativa do gerenciamento de zonas.
- Consultar o mapa em outra data não recalcula nem altera classificações de ocorrências passadas. Cada ocorrência conserva os `zone_id` e `zone_version` que motivaram sua classificação original.

### Sobreposições, duplicidades e exclusão acidental

- Sobreposições entre zonas distintas são permitidas, pois podem ser legítimas. A classificação mantém todas as zonas e versões correspondentes, conforme o contrato da história 17.
- Uma geometria espacialmente igual, do mesmo tipo, pertencente a outro `zone_id`, com vigência sobreposta, gera aviso de possível duplicidade. O Administrador pode prosseguir somente com justificativa explícita; aviso, decisão e justificativa são auditados. A versão do mesmo `zone_id` não conta como duplicidade.
- A sobreposição não é dissolvida, mesclada nem resolvida automaticamente. A ferramenta informa as zonas coincidentes para revisão humana.
- Não existe exclusão física pela operação normal. Correção, substituição ou retirada é feita com uma nova versão, preservando auditoria e histórico.

## Compatibilidade com a história 17

A história 17 já estabelece os tipos `INUNDACAO` e `RISCO`, geometria válida, estado ativo/inativo, vigência, versionamento, controle de concorrência, auditoria e vínculos da classificação com `zone_id`/`zone_version`. A história 25 mantém esses contratos e acrescenta semântica para transições efetivas, consulta histórica e justificativa de duplicidades.

A consulta operacional atual seleciona a versão mais recente registrada antes de avaliar sua vigência. Isso não atende ao agendamento de versões futuras: uma versão futura poderia ocultar a versão que ainda vale. A história de implementação deverá selecionar a versão efetiva para o instante de referência, tanto na classificação corrente quanto na consulta histórica.

## Critérios para uma história de implementação

A história futura deve:

1. Disponibilizar consulta administrativa de zonas para um instante, usando o algoritmo por `zone_id` descrito nesta especificação, e permitir comparar dois instantes.
2. Demonstrar que uma versão futura agendada não oculta a versão ainda vigente; no início agendado passa a valer a nova versão, e após uma versão inativa não ocorre fallback para uma versão antiga.
3. Criar e alterar versões de forma append-only e transacional, registrando ator, instante, motivo, versão esperada e relação de substituição quando aplicável.
4. Encerrar e arquivar por nova versão inativa, sem exclusão física; reativar cria outra versão.
5. Manter todas as zonas sobrepostas na classificação e sinalizar duplicidade espacial exata do mesmo tipo com vigência coincidente, exigindo justificativa auditada para exceção.
6. Preservar as classificações históricas das ocorrências e exibir a versão que as motivou, sem recálculo retroativo.
7. Restringir operações e consultas históricas a Administradores, com testes de autorização e evidência de PostGIS/RLS real no marco de validação integrada.
8. Validar geometria, limites de vigência, igualdade espacial, concorrência e transições temporais com testes automatizados; verificar o fluxo integrado no mapa e na API local.
9. Manter a ferramenta visual de desenho fora desta implementação, salvo se uma história posterior aprovar explicitamente sua experiência e integração.

## Validação e governança

Esta especificação define comportamento, não prova integração. A futura história registra validação básica e integrada separadamente. Mocks não certificam PostGIS, RLS ou permissões reais. Qualquer homologação compartilhada, commit, push, merge ou deploy permanece sob controle exclusivo do usuário.

## Riscos e limites

- A consulta é por vigência efetiva e pode refletir correções retroativas registradas depois; não é uma reconstrução bitemporal do que era conhecido em cada data.
- A interface e a API atuais ainda precisam ser avaliadas pela história de implementação para suportar consulta por instante e agendamento sem alterar a classificação corrente.
- O aviso de duplicidade não substitui a decisão operacional do Administrador sobre áreas que se sobrepõem legitimamente.

