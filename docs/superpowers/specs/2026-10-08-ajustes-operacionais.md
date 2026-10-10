# Ajustes operacionais — especificação aprovada

## Direção visual

- Interface municipal mantém os tokens do design system; ações semânticas usam azul `info` e vermelho `danger`.
- Registro público permanece exclusivamente no tema claro, sem controle de aparência.
- Priorizar ações explícitas, itens de lista visualmente separados e seletores expansíveis acessíveis.

## A. Ocorrências

- Transições mostram verbos claros: “Enviar para triagem” em azul e “Cancelar ocorrência” em vermelho. Justificativa só aparece quando a transição selecionada a exigir; validação do servidor permanece soberana.
- Autorização da foto é exigida somente quando o cidadão selecionou uma foto para envio; sem foto, não há controle de autorização. Consentimento visível e bloqueante no envio.
- Alertas mostram cada ocorrência como cartão separado e incluem protocolo/tipo, prioridade, status e horário. Buscar metadados das ocorrências visíveis em uma única chamada autenticada e limitada aos grupos do operador.
- A rota pública força tokens claros sem alterar a preferência persistida do painel.

## B. Abrigos

- Rótulo “Capacidade” passa a “Capacidade total”; vagas disponíveis são `max(capacidade - ocupados, 0)`.
- Situação Lotado é derivada quando ocupação alcança/supera capacidade; Aberto/Encerrado continuam decisões operacionais. Quantidades são identificadas conforme o tipo do abrigo.
- Listagem usa ações Google Maps e Waze no lugar das coordenadas em texto.
- Links curtos reconhecidos do Google Maps são aceitos quando coordenadas válidas já foram informadas. Não fazer resolução HTTP server-side de links fornecidos por usuário. Sem coordenadas extraíveis nem coordenadas explícitas, mostrar erro específico.

## C. Administração de grupos e usuários

- Remover o checkbox “Grupo padrão” do formulário de criação; manter “Definir como padrão” na lista de grupos.
- No formulário de cadastro de usuário, ordenar os campos exclusivamente ali como Nome, Telefone, E-mail; não alterar a ordem de outras telas.
- Seleções de grupos no cadastro/edição de usuário usam lista expansível multi-seleção, com resumo das escolhas.
- Tela de pessoas por grupo permite adicionar usuários municipais existentes, editar perfil (nome, telefone, papel/estado e grupos autorizados) e remover vínculo com o grupo.
- E-mail de autenticação não é alterado pela edição de perfil; mudança de identidade requer fluxo próprio de autenticação.
- Restrições de administrador, autoproteção e escopo municipal continuam valendo; alterações ficam auditadas.

## Critérios de aceitação

1. Cada ação de transição tem verbo claro e cor semântica; justificativa é condicional sem relaxar validação de negócio.
2. Envio com foto não prossegue sem autorização; envio sem foto não exige nem exibe consentimento; intake continua claro mesmo com preferência escura salva.
3. Alertas visualmente distintos mostram protocolo/tipo sem misturar ocorrências.
4. Vagas e estado de lotação são coerentes; rotas usam coordenadas e ambos os destinos.
5. URL curta do Maps junto a coordenadas válidas salva; URL maliciosa/desconhecida e localizações incompletas continuam rejeitadas.
6. Grupos são expansíveis e removido o controle redundante de grupo padrão.
7. Administrador municipal consegue adicionar/editar perfil/remover vínculo de pessoas; não administrador e edição da própria conta permanecem bloqueados.
