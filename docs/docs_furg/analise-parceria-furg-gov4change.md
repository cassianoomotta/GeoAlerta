# Oportunidades de parceria — GeoAlerta e professor Guilherme Wiedenhöft

Análise documental em 8 de outubro de 2026.

## Conclusão executiva

A oportunidade mais consistente é uma parceria de pesquisa aplicada: utilizar o GeoAlerta como ambiente de implementação e avaliação de uma parte do modelo de governança do Gov4Change. O professor e sua equipe contribuiriam com método, definição de indicadores e articulação com atores municipais; o GeoAlerta contribuiria com plataforma, adaptação dos fluxos, capacitação e suporte delimitado ao piloto.

Os materiais mostram aderência entre necessidades identificadas nos workshops e funcionalidades do aplicativo. Ainda não demonstram eficácia operacional do GeoAlerta, intenção de compra dos municípios, autorização de uso comercial do modelo ou compromisso institucional com o aplicativo. Esses resultados devem ser construídos durante a parceria.

A proposta de R$ 30 mil por cinco meses, relatada pelo usuário no chat “Avaliar proposta da FURG” e atribuída por ele ao professor Guilherme, pode ser uma porta de entrada para essa parceria. O valor, isoladamente, não permite concluir viabilidade econômica. Recomenda-se negociar um piloto delimitado, sem assumir desenvolvimento integral das seis dimensões ou suporte emergencial permanente.

## Base e limites da análise

Foram lidos os cinco arquivos Markdown da pasta indicada pelo usuário, que contêm conversões de documentos:

1. **Resultado Workshop 2 — SAP.xlsx.md:** registro de contribuições sobre mecanismos, indicadores e atores.
2. **Síntese Qualitativa Integrada WS1 e 2.docx.md:** interpretação consolidada dos workshops de Rio Grande e Santo Antônio da Patrulha.
3. **Sintese-Qualitativa-Integrada.pptx.md:** apresentação do Gov4Change, objetivos, equipe, estudos em andamento e síntese dos resultados.
4. **Ficha de Validação — Gov4Change.docx.md:** instrumento de avaliação do modelo.
5. **Ficha de Validação — Gov4Change.pdf.md:** outra versão do mesmo instrumento.

Também foram consultados o chat referenciado, README, documentos de produto e roadmap do GeoAlerta e trechos do código dos módulos. A inspeção de código foi documental: não houve teste funcional, acesso ao ambiente implantado ou auditoria técnica completa.

Os cinco arquivos não representam cinco estudos independentes: há repetição da ficha e reapresentação da síntese. A conversão da planilha contém rótulos inconsistentes, campos vazios e aparentes misturas entre mecanismos e indicadores. Isso exige revisão com os pesquisadores antes de transformar o material em requisitos ou medidas quantitativas. Não foram encontrados dados que permitam calcular percentuais de concordância ou representatividade da amostra.

A ficha do Workshop 3 identifica EnANPAD 2026 e o período de 23 a 25 de setembro. Embora essa data seja anterior à análise, o arquivo está em branco: não comprova realização, resultados ou aprovação do modelo nesse evento. Tampouco constitui validação do aplicativo.

## O que os documentos revelam

O objetivo do Gov4Change é compreender a governança pública inteligente na redução de impactos econômicos e sociais de eventos climáticos extremos, com contexto comparativo entre cidades do RS, Alemanha e Áustria. O resultado esperado é um framework de governança; sua agenda inclui desenvolvimento, validação, acompanhamento e avaliação da aplicação da solução.

O problema recorrente nos workshops é a dificuldade de coordenação: informações dispersas, responsabilidades pouco claras, desconhecimento da capacidade disponível e ausência de acompanhamento integrado antes, durante e depois do desastre.

Isso aproxima o GeoAlerta da pesquisa: o registro georreferenciado pode iniciar um fluxo que passa por triagem, órgão responsável, equipe, acolhimento e monitoramento. A contribuição mais promissora não é apenas apresentar informações num mapa, mas permitir observar como atores tomam decisões e executam ações com essas informações.

Entre os estudos em andamento citados na apresentação, quatro têm conexão direta ou próxima com o aplicativo:

- **“Entre o alerta e a ação dos sistemas de comunicação na gestão de desastres: proposição de uma nova ferramenta”**: conexão mais direta com o fluxo cidadão → painel → resposta.
- **“Governança de dados aplicada à gestão de crises climáticas: uma proposta de modelo estratégico”**: padrões, qualidade, responsabilidade e uso das informações.
- **“Capacidade tecnológica no enfrentamento a desastres climáticos...”**: adoção, limitações de conectividade e prontidão municipal.
- **“As práticas de voluntariado nas emergências climáticas”**: competências, disponibilidade e coordenação do voluntariado.

Não é possível identificar, apenas pelos arquivos, qual desses estudos corresponde à dissertação mencionada na oferta.

## Correspondência entre o modelo e o GeoAlerta

| Dimensão | Evidência documental | Conexão com o GeoAlerta | Oportunidade de parceria |
|---|---|---|---|
| Preservação da vida | Ocorrências, grupos vulneráveis, equipes e atendimento prioritário | Registro com localização, mapa de riscos, priorização e equipes | Validar critérios de triagem, encaminhamento e acompanhamento; medir tempos sem presumir redução de mortalidade |
| Orquestração | Canal único, sala de crise, histórico, tarefas com prazos e status | Painel, alertas in-app, status e atribuição a órgãos | Definir responsabilidades, confirmação de recebimento, escalonamento e registros das decisões |
| Abrigos | Pessoas, animais e acolhimento misto; capacidade, entradas, saídas e necessidades | Módulo de abrigos, ocupação e cadastro de acolhidos | Validar fluxo de encaminhamento, atualização da ocupação e necessidades pendentes |
| Necessidades básicas | Doações, validade, estoque e quantidade necessária versus disponível | Módulo de recursos e referências a movimentações | Definir demanda por abrigo, rastreabilidade da distribuição e indicadores de atendimento |
| Infraestrutura | Acessos, energia, água, internet, veículos e equipamentos | Ocorrências geográficas e equipes cobrem parte do problema | Construir um inventário operacional mínimo; avaliar posteriormente conectividade e informação sobre serviços essenciais |
| Assistência psicossocial | Acompanhamento, realocação, auxílio-moradia e recuperação | Cadastro e ocorrências oferecem conexões parciais | Pesquisar um fluxo futuro de encaminhamentos e acompanhamento pós-evento, sem pressupor prontuário clínico |

A aderência é mais direta em ocorrências, orquestração, abrigos e recursos. Infraestrutura e recuperação psicossocial requerem maior especificação de processos e responsabilidades.

Há componentes e telas correspondentes a vários desses módulos no código. Isso não confirma implantação, disponibilidade ou fidelidade de todos os indicadores. O roadmap ainda registra aplicação de migração como pendência. A implantação deve ser conferida antes de prometer operação em campo.

Também há uma diferença importante entre cadastrar dados e produzir indicadores confiáveis. Contar ocorrências resolvidas não equivale a contar pessoas socorridas. Um status atual não permite reconstruir, sozinho, o tempo gasto em cada etapa. Dados de pesquisa exigem definições e eventos observáveis acordados previamente.

## Oportunidades priorizadas

### 1. Piloto municipal de pesquisa aplicada — prioridade imediata

**Proposta:** implementar um recorte do modelo em um município, preferencialmente com atores já vinculados aos workshops, se houver disponibilidade e autorização. Santo Antônio da Patrulha e Rio Grande são candidatos documentais; não há compromisso de participação demonstrado.

**Professor/equipe:** selecionar o recorte científico, articular gestores, elaborar protocolo de avaliação e interpretar resultados.

**GeoAlerta:** preparar o ambiente, adaptar fluxos acordados, capacitar usuários e disponibilizar registros e exportações necessários.

**Resultado comum:** caso documentado de aplicação, com limitações e evidências de uso. O professor obtém material empírico; o aplicativo obtém aprendizado operacional e, mediante autorização, um caso de referência.

### 2. Indicadores e governança de dados — prioridade imediata

**Proposta:** converter os indicadores amplos dos workshops em um pequeno dicionário mensurável: definição, unidade, fonte, responsável, frequência de atualização e limitações.

Indicadores candidatos, a validar:

| Indicador proposto | Como observar | Limite |
|---|---|---|
| Tempo de reconhecimento | Registro → confirmação de recebimento pelo operador | Exige evento de confirmação; visualizar a tela não basta |
| Tempo de encaminhamento | Registro → atribuição ao órgão responsável | Atribuição não comprova chegada da equipe |
| Pendências por prioridade | Ocorrências abertas por prioridade e idade | Depende de status e critérios consistentes |
| Ocupação de abrigo | Pessoas presentes ÷ capacidade operacional declarada | Exige registro confiável de entradas e saídas |
| Completude dos dados | Registros com campos acordados ÷ total observado | Não comprova veracidade dos campos |
| Clareza de responsabilidades | Avaliação dos operadores e análise das tarefas | É medida de processo, não de impacto social final |

Essas medidas são propostas desta análise, não resultados dos documentos. Para o MVP, exportação local CSV e análise posterior atendem ao recorte; não é necessário criar integração bidirecional com planilhas.

### 3. Protocolos e capacitação — prioridade imediata

**Proposta:** produzir rotinas curtas para registro, triagem, atribuição, atualização, encaminhamento ao abrigo e encerramento. Cada rotina deve indicar quem decide, quem executa, quem atualiza e quando escalar.

O professor pode contribuir com a estrutura de governança e a avaliação das responsabilidades; a equipe GeoAlerta, com a tradução dessas rotinas em uso do produto. O município precisa designar operadores e responsáveis. Um sistema centralizado só se torna referência operacional se os atores assumirem essa rotina.

### 4. Replicação para outros municípios — etapa posterior

**Proposta:** transformar o piloto em um pacote repetível: diagnóstico, configuração, treinamento, indicadores e avaliação de adoção.

Há base documental para explorar replicabilidade, mas workshops não provam orçamento, intenção de compra ou autorização de contratação. Devem ser investigados patrocinador institucional, responsáveis pelo uso, capacidade de manter os dados e disposição para financiar continuidade.

A rede nacional e internacional listada na apresentação pode ampliar intercâmbio e pesquisa comparativa. A presença de nomes na apresentação não significa participação disponível, endosso ao GeoAlerta ou acesso comercial garantido.

### 5. Apoio institucional à inovação — via complementar

A FURG possui uma estrutura que declara atuação em parcerias de pesquisa e transferência de tecnologia: a PROITI. Sua INNOVATIO oferece apoio à validação e modelagem de negócios, gestão e desenvolvimento estratégico, com ingresso por editais públicos. São caminhos a investigar com o professor, sem presumir elegibilidade, vaga, financiamento ou aprovação. Fontes: [PROITI/FURG](https://proiti.furg.br/en/) e [INNOVATIO](https://innovatio.furg.br/nova-home).

## Recorte sugerido para os cinco meses

Hipótese de negociação, ainda sujeita a estimativa técnica e orçamento: **um município; dois fluxos centrais — ocorrências e acolhimento em abrigos; até cinco indicadores; duas rodadas de avaliação; adaptações limitadas e identificadas após diagnóstico.**

| Mês | Entrega | Evidência de aceite proposta |
|---|---|---|
| 1 | Diagnóstico, recorte da pesquisa, responsabilidades e plano de trabalho | Fluxos, indicadores, dependências, horas e exclusões registrados e aceitos |
| 2 | Preparação do ambiente e adaptações priorizadas | Demonstração dos cenários acordados com dados sintéticos |
| 3 | Capacitação e primeira simulação | Registro da sessão, dificuldades observadas e medições iniciais |
| 4 | Correções previstas e segunda avaliação | Comparação dos cenários e lista documentada de limitações |
| 5 | Relatório técnico e plano de continuidade | Relatório, dicionário de dados, CSV e orientação de operação entregues |

O aceite não deve depender de ocorrer um desastre real. Simulações permitem avaliar uso e processo; seus resultados precisam ser identificados como simulados. Melhoria em simulação não comprova impacto em emergência real. Se houver evento durante o projeto, eventual observação deve seguir condições previamente acordadas.

Recursos e voluntários podem apoiar os cenários com funcionalidades existentes, sem gerar compromisso de construir módulos novos completos. Sensores, previsão de enchentes, integrações externas, operação sem internet, aplicativo nativo, monitoramento de infraestrutura e prontuário psicossocial ficam para negociação separada. O piloto preserva localização nativa obrigatória, verificação de áreas de risco, alertas in-app e exportação CSV previstos nas regras do GeoAlerta.

## Como tratar a oferta de R$ 30 mil

O chat anterior discutiu custos de colaborador, CNPJ e operação. Esta análise não recalcula tributos ou encargos e não adota suas estimativas como orçamento confirmado. O valor informado equivale a R$ 6 mil brutos por mês para todo o serviço, não apenas para a remuneração de um profissional.

O ganho estratégico só deve entrar na decisão quando houver contrapartidas concretas: acesso acordado a gestores, tempo reservado da equipe de pesquisa, avaliações agendadas e condições para documentar o caso. Promessas genéricas de visibilidade ou trabalhos futuros não devem financiar horas adicionais sem limite.

Pontos a registrar na negociação:

- Qual dissertação e qual pergunta de pesquisa serão atendidas; vínculo entre essa dissertação e o Gov4Change.
- Quem contrata, quem paga, quem aceita as entregas e quais documentos regem a despesa. O usuário mencionou “Fapers”; os materiais identificam FAPERGS, mas não incluem o instrumento da oferta.
- Quantidade de horas, adaptações, reuniões, avaliações e suporte incluídos; procedimento para mudanças de escopo.
- Responsabilidades sobre conectividade, dispositivos, operadores, polígonos de risco e atualização dos dados.
- Distinção entre software preexistente, contribuições do framework, novas adaptações e materiais de pesquisa; direitos de uso e continuidade a negociar com a instância institucional competente.
- Regras de acesso aos dados, preparação de conjuntos para pesquisa e divulgação dos resultados; preferência por dados sintéticos nas demonstrações e dados agregados ou adequadamente anonimizados nas análises compartilhadas.
- Autorização para mencionar parceria, nomes, marcas e resultados em materiais comerciais; publicação e referência institucional não são automáticas.
- Encerramento do serviço e condições de manutenção após o quinto mês.

Esses pontos são uma pauta de negociação, não uma conclusão jurídica sobre titularidade ou modalidade contratual.

## Perguntas para a primeira reunião

1. O resultado esperado é desenvolver software, aplicar o framework ou avaliar uma ferramenta já existente?
2. Qual estudo/dissertação receberá os resultados e quais evidências são indispensáveis?
3. Qual município participará e quem disponibilizará operadores e tempo para as avaliações?
4. Quais dois processos serão priorizados e quais solicitações ficarão fora dos cinco meses?
5. O que exatamente os R$ 30 mil devem cobrir e qual o calendário de pagamento?
6. Como ficam uso do software, dados, publicações e referência ao caso após o projeto?
7. Quem poderá manter a operação depois do piloto e como será tomada essa decisão?

## Formulação sugerida da proposta

> Propomos utilizar o GeoAlerta como ambiente de aplicação e avaliação de um recorte do modelo Gov4Change em um município. Durante cinco meses, o trabalho contemplará diagnóstico dos fluxos de ocorrências e acolhimento, adaptações delimitadas, capacitação, duas avaliações e relatório técnico com indicadores acordados. A equipe de pesquisa contribuirá com método, articulação institucional e análise dos resultados; o GeoAlerta, com plataforma e suporte técnico dentro do escopo definido. As condições de uso do software, tratamento de dados, divulgação e continuidade serão acordadas antes do início.

## Referências locais

Pasta de origem: `/Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg`.

- [Apresentação Gov4Change](/Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg/Sintese-Qualitativa-Integrada.pptx.md)
- [Síntese WS1 e WS2](</Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg/Síntese Qualitativa Integrada WS1 e 2.docx.md>)
- [Resultado Workshop 2](</Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg/Resultado Workshop 2 - SAP.xlsx.md>)
- [Ficha de validação — versão DOCX](</Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg/Ficha de Validação  - Gov4Change.docx.md>)
- [Ficha de validação — versão PDF](</Users/hcosta/Documents/Projetos/Repositorios/GeoAlerta/docs/docs_furg/Ficha de Validação  - Gov4Change.pdf.md>)
- [Chat “Avaliar proposta da FURG”](thread://01a11981-e503-7240-ad18-c111547972c0?hostId=local)
- [Produto e requisitos](/Users/hcosta/.codex/worktrees/04ef/GeoAlerta/Core/PRD.md)
- [Roadmap](/Users/hcosta/.codex/worktrees/04ef/GeoAlerta/Core/TASKS.md)

As oportunidades, prioridades e o recorte de cinco meses são recomendações analíticas. Não representam compromissos assumidos pelo professor, pela FURG, pela FAPERGS ou pelos municípios.
