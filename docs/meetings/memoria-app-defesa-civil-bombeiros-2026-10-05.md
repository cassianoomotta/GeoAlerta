Foi realizada uma reunião com o Cassiano em **05/10/2026** para passar o ajuste de visão do app utilizando o conceito de deixar de vender o martelo para vender o **“quadro na parede”**.

# Memória da ação — App da Defesa Civil e dos Bombeiros

## Contexto e propósito

O app está sendo construído para apoiar a Defesa Civil e os Bombeiros na resposta a crises climáticas em municípios. O núcleo inicialmente pensado é a abertura e a gestão de ocorrências, com uma interface para o cidadão reportar necessidades e uma central para coordenar o atendimento.

A discussão partiu da metáfora de que as pessoas não compram uma ferramenta pelo objeto em si: querem o resultado que ela permite alcançar. Aplicada ao app, essa visão desloca a conversa de uma lista de funcionalidades para a capacidade operacional que o município precisa ter durante uma crise.

Este registro reúne o ajuste de visão e as sugestões para aprofundamento. Não representa uma especificação técnica fechada nem a aprovação de todas as capacidades mencionadas.

## Mudança de foco: funcionalidades → resultado operacional

“Sistema de gestão de ocorrências” descreve o instrumento. A proposta de valor deve explicar como o município consegue responder quando chegam muitos pedidos de ajuda ao mesmo tempo, por canais diferentes, com informações incompletas e equipes distribuídas pela cidade.

O resultado pretendido é reduzir demandas perdidas, dar visibilidade às necessidades, apoiar a priorização e coordenar as equipes com acompanhamento do atendimento. Esses resultados devem ser validados na operação; não são garantias já demonstradas pelo app.

**Proposta de valor:** transformar pedidos de ajuda dispersos em uma resposta municipal coordenada, priorizada e rastreável durante crises climáticas.

## Martelo, prego, quadro e parede

| Elemento da metáfora | Significado no app |
| --- | --- |
| **Martelo** | Plataforma web, formulário, mapa, dashboard, APIs e demais ferramentas. |
| **Prego** | Registrar, localizar, classificar e distribuir ocorrências. |
| **Quadro** | Saber o que está acontecendo na cidade e coordenar a resposta às necessidades. |
| **Parede** | A operação municipal de resposta a crises funcionando mesmo sob sobrecarga. |
| **Resultado final** | Menos demandas perdidas, melhor priorização e resposta mais rápida às pessoas que precisam de ajuda. |

Para saber qual “quadro” entregar, é preciso entender a operação concreta do município: suas dores, canais, critérios de prioridade, responsáveis, recursos disponíveis e limitações. A escolha das funcionalidades decorre desse entendimento.

## Não vender apenas um sistema de ocorrências

Abrir um registro não significa que a pessoa recebeu ajuda. O valor aparece quando o pedido entra em um fluxo que permite entender a necessidade, decidir a prioridade, atribuir responsabilidade e acompanhar o atendimento até o encerramento.

A apresentação do produto deve partir do problema operacional:

> Como transformar dezenas ou centenas de pedidos desorganizados em uma operação coordenada de resposta?

Uma formulação para orientar a comunicação do app:

> Ajudamos a Defesa Civil e os Bombeiros a receber, localizar e priorizar pedidos de ajuda, distribuir equipes e acompanhar cada atendimento durante uma crise climática.

## Fluxo principal de atendimento

**Cidadão reporta → central recebe → localiza → prioriza → atribui equipe → acompanha → encerra.**

1. **Cidadão reporta:** informa a necessidade, a localização e os dados disponíveis sobre a situação.
2. **Central recebe:** reúne os pedidos e verifica informações essenciais e possíveis duplicidades.
3. **Localiza:** identifica onde está a demanda e sua relação com a área afetada.
4. **Prioriza:** avalia a gravidade, a urgência e o contexto, conforme critérios definidos pelos responsáveis pela operação.
5. **Atribui equipe:** indica quem atenderá e quais recursos são necessários.
6. **Acompanha:** registra o andamento, as atualizações da equipe e os impedimentos encontrados.
7. **Encerra:** registra o desfecho e permite consultar o histórico do atendimento.

A rastreabilidade deve permitir responder: o que foi solicitado, onde, quando, qual prioridade foi atribuída, quem ficou responsável, o que aconteceu e qual foi o desfecho.

## Visão de sala de crise

A sala de crise precisa de uma visão compartilhada da situação municipal e da resposta em andamento. O app deve apoiar perguntas operacionais como:

- Onde estão as demandas e quais precisam de atenção primeiro?
- Quais ocorrências ainda não têm equipe responsável?
- Quais equipes estão disponíveis, em deslocamento ou atendendo?
- Onde há concentração de pedidos, áreas alagadas ou dificuldades de acesso?
- Quais atendimentos estão parados por falta de recursos ou de informação?

O mapa e os painéis fazem sentido quando ajudam a tomar essas decisões. A visão de sala de crise deve conectar demandas, prioridades, equipes e recursos.

## Telefone 193: dor de um canal síncrono

Foi relatado que, no município considerado, com aproximadamente **50 mil habitantes**, o telefone 193 dispõe de apenas uma linha. Enquanto uma pessoa é atendida, outra pode encontrar a linha ocupada. Esse é um dado do contexto apresentado, a confirmar com a operação local.

O problema é a limitação de um canal síncrono diante de pedidos simultâneos. A interface de reporte pelo cidadão pode oferecer uma entrada adicional e alimentar a mesma coordenação operacional. Sua contribuição depende de como os pedidos serão recebidos, monitorados, triados e encaminhados pela central.

A proposta do app não deve ser apresentada como se, por si só, aumentasse a capacidade da linha telefônica. Também é necessário definir como os canais coexistem e como o cidadão saberá que o pedido foi recebido e qual orientação seguir.

## Capacidades ao redor do núcleo

O núcleo é transformar o pedido de ajuda em atendimento coordenado e acompanhado. As demais capacidades devem apoiar esse fluxo e ser priorizadas conforme a necessidade real da operação.

| Capacidade | Contribuição para a resposta |
| --- | --- |
| **Mapa de ocorrências** | Localizar demandas, identificar concentrações e acompanhar os atendimentos no território. |
| **Polígonos de áreas alagadas** | Delimitar regiões afetadas e contextualizar riscos e decisões de deslocamento. |
| **Gestão de abrigos** | Acompanhar locais de acolhimento, disponibilidade e necessidades. |
| **Gestão de recursos** | Dar visibilidade aos meios disponíveis e às limitações para atender. |
| **Mantimentos e suprimentos** | Coordenar necessidades e distribuição de água, alimentos e outros itens. |
| **Primeiros socorros e necessidades médicas** | Registrar necessidades e apoiar o encaminhamento aos responsáveis pelo atendimento. |
| **Gestão de equipes e voluntários** | Organizar disponibilidade, atribuições e acompanhamento das equipes, inclusive reforços mobilizados durante a crise. |

Essas capacidades compõem uma visão de evolução do produto. A existência de muitas possibilidades não deve tirar o foco da entrega principal.

## Sugestão de entidade Evento / Incident

Como sugestão de modelagem a validar, criar uma entidade **Evento / Incident** para representar uma crise ou operação, contendo múltiplas ocorrências relacionadas.

**Exemplo ilustrativo:**

```text
Evento / Incident: enchente no município
├── Ocorrência: família ilhada no bairro A
├── Ocorrência: necessidade de água no abrigo B
└── Ocorrência: pedido de resgate no bairro C
```

O evento reúne o contexto geral da crise, como período, área afetada, coordenação e recursos mobilizados. Cada ocorrência mantém seu próprio pedido, localização, prioridade, equipe responsável, andamento e desfecho.

Essa organização pode apoiar a visão da sala de crise e a análise posterior da resposta municipal. A nomenclatura e a relação entre evento, ocorrência e atendimento ainda precisam ser confirmadas com os usuários.

## Perguntas-chave para futuras reuniões

### Resultado e problema prioritário

- Qual é a maior dificuldade hoje: receber pedidos, localizar, priorizar, distribuir equipes ou acompanhar o atendimento?
- Em qual etapa os pedidos se perdem ou ficam sem responsável?
- O que precisa melhorar para a operação considerar o app útil?
- Quais indicadores podem demonstrar essa melhora: tempo até triagem, tempo até atribuição, demandas sem responsável ou proporção de atendimentos com desfecho registrado?

### Canais e entrada dos pedidos

- Como funciona hoje o 193 e quais outros canais recebem solicitações?
- Quem ficará responsável por monitorar a entrada digital e em quais períodos?
- Quais informações mínimas são necessárias para agir, inclusive quando o cidadão não sabe o endereço exato?
- Como reconhecer pedidos duplicados e comunicar o recebimento ao cidadão?
- Como a operação funciona quando faltam internet ou energia?

### Triagem, equipes e acompanhamento

- Quem decide a prioridade e quais critérios utiliza?
- Quem pode atribuir ou reatribuir equipes e alterar a prioridade?
- Como a central conhece a disponibilidade, a capacidade e a localização das equipes?
- Como equipes e voluntários recebem a missão e informam seu andamento?
- O que caracteriza o encerramento de uma ocorrência e como registrar pendências ou reabertura?

### Sala de crise e evolução do produto

- Que informações a coordenação precisa enxergar para decidir durante a crise?
- Como são identificadas e atualizadas as áreas alagadas?
- Faz sentido agrupar várias ocorrências em um Evento / Incident? Quem abre e encerra esse evento?
- Qual capacidade complementar é indispensável para o primeiro uso operacional?
- Quais dados precisam ser acessíveis a cada perfil de usuário?
- Como validar o fluxo completo em um exercício ou piloto e avaliar seus resultados com os responsáveis?

## Diretriz registrada

Orientar a visão e a apresentação do app pelo resultado operacional: **transformar um pedido de ajuda em uma resposta coordenada, priorizada e rastreável**. O fluxo de ocorrências permanece como núcleo, e as capacidades complementares devem fortalecer a coordenação municipal durante a crise.

**Origem do registro:** contexto da conversa “Branch · Aplicar resultado na vida” e pontos solicitados para esta memória. A metáfora do martelo e do “quadro na parede” foi utilizada como referência para o ajuste de visão.
