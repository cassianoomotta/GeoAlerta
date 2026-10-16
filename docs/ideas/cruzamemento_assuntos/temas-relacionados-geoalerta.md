# Temas relacionados ao GeoAlerta

Este documento reúne áreas de pesquisa que se conectam ao problema e ao escopo atual do GeoAlerta Core: registro cidadão de ocorrências com localização, triagem municipal, cruzamento com zonas de risco, mapa e alertas no painel. São possibilidades para exploração acadêmica e evolução do projeto, não afirmações de que todas essas capacidades já estejam implementadas.

## Temas com forte relação

### 1. Ciência cidadã e participação comunitária no monitoramento de inundações

**Relação com o GeoAlerta:** moradores observam alagamentos e inundação diretamente no território; o registro geolocalizado transforma observações locais em informação que pode apoiar a leitura municipal do evento. O projeto brasileiro Dados à Prova d'Água/Cemaden é uma referência próxima de monitoramento comunitário com aplicativo e participação de escolas e defesas civis.

**Possível recorte:** como aplicativos de registro de ocorrências podem complementar redes oficiais de monitoramento hidrometeorológico em escala municipal?

**Caminho de investigação:** revisão de iniciativas de ciência cidadã, análise de fluxos de participação e entrevistas com cidadãos e equipes de Defesa Civil. Distinguir registro operacional de ocorrência de um projeto completo de ciência cidadã, que também pode envolver participantes no desenho e interpretação da pesquisa.

**Referências:** [See (2019), revisão sobre ciência cidadã e crowdsourcing em inundações pluviais](https://doi.org/10.3389/feart.2019.00044); [Cemaden, projeto Dados à Prova d'Água](https://educacao.cemaden.gov.br/projeto/dados-a-prova-dagua/).

### 2. Qualidade, credibilidade e incerteza de relatos geográficos voluntários

**Relação com o GeoAlerta:** localização GPS é necessária para relacionar ocorrências a áreas de risco, mas coordenadas precisas, por si só, não provam a exatidão do relato. Duplicidade, atraso, erro de localização e interpretação diferente do que constitui alagamento podem afetar a triagem.

**Possível recorte:** quais sinais de qualidade podem ajudar gestores a revisar relatos de inundação sem descartar indevidamente observações válidas?

**Caminho de investigação:** estudar completude, duplicidade espaço-temporal, distância entre posição do dispositivo e local informado, evidências anexadas e confirmação por outras fontes. Avaliar os critérios com revisão humana e registrar incerteza, evitando transformar uma pontuação experimental em decisão automática sem validação local.

**Referências:** [Safariallahkheili e Malek (2022), avaliação da credibilidade de informação geográfica voluntária em crises de inundação](https://doi.org/10.1016/j.procs.2022.09.218); [See (2019)](https://doi.org/10.3389/feart.2019.00044).

### 3. Cruzamento espacial de ocorrências, manchas de inundação e zonas de risco

**Relação com o GeoAlerta:** a regra de classificar como alta prioridade uma ocorrência que intersecta uma mancha ativa depende da qualidade e atualidade das camadas geográficas, da definição de sobreposição e da escala espacial usada.

**Possível recorte:** como a escolha da camada, resolução e regra de interseção altera a identificação e priorização de ocorrências em áreas suscetíveis?

**Caminho de investigação:** comparar ocorrências com polígonos de inundação e zonas de risco, medir casos de interseção e proximidade, analisar geometrias incompletas e avaliar resultados com equipes locais. Manter separados perigo (chance/intensidade do evento), exposição (pessoas e bens no local) e vulnerabilidade (capacidade de sofrer e responder).

**Referências:** [See (2019), uso de relatos para validação de modelos e sistemas de alerta](https://doi.org/10.3389/feart.2019.00044); [Martins-Filho et al. (2024), análise de vulnerabilidades e capacidades de gestão de risco no RS](https://www.sciencedirect.com/science/article/pii/S2212420924004072).

### 4. Vulnerabilidade social, exposição e justiça na gestão do risco

**Relação com o GeoAlerta:** um mapa de ocorrências mostra onde chegaram relatos, mas não necessariamente onde o risco é maior ou onde a população tem menos condições de se proteger. A cobertura do aplicativo também pode refletir desigualdades de acesso e conectividade.

**Possível recorte:** a distribuição dos relatos recebidos corresponde à distribuição da exposição e da vulnerabilidade social no município?

**Caminho de investigação:** agregar dados geográficos públicos e socioeconômicos em unidades territoriais apropriadas; comparar densidade de registros, áreas inundáveis, população exposta e indicadores sociais; discutir vieses de representação, privacidade e limites de inferência. Não inferir características individuais de quem registrou uma ocorrência a partir de indicadores agregados do bairro.

**Referências:** [Chakraborty e Thistlethwaite (2023), hotspots de vulnerabilidade e exposição a inundações](https://doi.org/10.1111/risa.13978); [Reimann et al. (2024), vulnerabilidade social em mapas globais de risco de inundação](https://doi.org/10.1029/2023EF003895); [Martins-Filho et al. (2024), estudo do RS](https://www.sciencedirect.com/science/article/pii/S2212420924004072).

### 5. Sistemas de apoio à decisão e triagem operacional em Defesa Civil

**Relação com o GeoAlerta:** painel, mapa, prioridade alta e alertas in-app apoiam a atenção dos gestores. A utilidade depende de ajudar a decidir e agir, sem sobrecarregar a equipe nem apresentar uma classificação como certeza absoluta.

**Possível recorte:** que combinação de localização, tipo de ocorrência, interseção com área de risco e atualização temporal é útil para ordenar a triagem municipal?

**Caminho de investigação:** mapear o processo de trabalho; definir critérios com profissionais; avaliar tempo até análise, consistência entre avaliadores, alertas úteis e falsos positivos; comparar a triagem apoiada pelo sistema com a prática existente. A automação deve ser avaliada como apoio à decisão, com possibilidade de revisão humana.

**Referências:** [Thaler e Hartmann (2016), revisão de métodos multicritério para gestão de risco de inundação](https://doi.org/10.5194/nhess-16-1019-2016); [Cemaden, experiência de alertas precoces no RS em 2024](https://www.sciencedirect.com/science/article/pii/S2212420925004698).

### 6. Comunicação de risco, alertas e resposta centrada nas pessoas

**Relação com o GeoAlerta:** alertas in-app para gestores podem acelerar a ciência de novas ocorrências, mas o aviso só é útil se chegar à pessoa certa, no momento adequado, com contexto e ação esperada. O painel interno não deve ser confundido com um sistema público de alerta e evacuação.

**Possível recorte:** quais informações tornam um alerta interno acionável e reduzem o tempo entre recebimento, reconhecimento e encaminhamento de uma ocorrência?

**Caminho de investigação:** observar o fluxo do alerta à providência, testar clareza e carga de notificações, e definir medidas de tempo de resposta e de alertas não acionáveis. Considerar falha de conectividade e canais alternativos em situações de crise.

**Referências:** [Cemaden/MCTI, experiência de alertas precoces durante as inundações de 2024 no RS](https://www.sciencedirect.com/science/article/pii/S2212420925004698); [See (2019)](https://doi.org/10.3389/feart.2019.00044).

### 7. Proteção de dados e privacidade da geolocalização em relatos de risco

**Relação com o GeoAlerta:** a coordenada de uma ocorrência é central para a resposta, mas pode revelar residência, rotina ou situação de vulnerabilidade de uma pessoa. O projeto precisa equilibrar precisão operacional, acesso autorizado e divulgação segura de mapas e exportações.

**Possível recorte:** quais práticas de minimização, controle de acesso e agregação preservam a utilidade geográfica sem expor dados pessoais?

**Caminho de investigação:** mapear finalidade e ciclo de vida dos dados, perfis de acesso, retenção, exportação e níveis de detalhe público/interno; testar o risco de reidentificação em mapas agregados. A localização pode ser dado pessoal quando permitir identificar alguém, conforme orientação pública do Ministério das Cidades sobre a LGPD.

**Referências:** [Ministério das Cidades, classificação de dados pessoais e dados de localização](https://www.gov.br/cidades/pt-br/acesso-a-informacao/lei-geral-de-protecao-de-dados-pessoais-2013-lgpd/classificacao-dos-dados-pessoais); [Lei nº 13.709/2018 (LGPD)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

### 8. Acessibilidade, inclusão digital e cobertura territorial do registro cidadão

**Relação com o GeoAlerta:** o registro depende de smartphone, permissão de localização, conectividade e compreensão da interface. Logo, ausência de relatos não significa necessariamente ausência de alagamento ou de necessidade.

**Possível recorte:** que grupos ou territórios ficam sub-representados em plataformas móveis de registro de ocorrências e quais alternativas reduzem essa lacuna?

**Caminho de investigação:** avaliar usabilidade e acessibilidade com diferentes perfis; examinar distribuição espacial e temporal dos registros; investigar alternativas assistidas ou presenciais e mecanismos de registro com conectividade limitada. Evitar interpretar áreas sem relatos como áreas seguras.

**Referências:** [See (2019), desafios e potencial da participação cidadã em inundações](https://doi.org/10.3389/feart.2019.00044); [Cemaden, Dados à Prova d'Água e participação comunitária](https://educacao.cemaden.gov.br/projeto/dados-a-prova-dagua/).

## Priorização inicial

Para um primeiro estudo diretamente viável com o GeoAlerta, os cruzamentos **2 (qualidade dos relatos)**, **3 (análise espacial)** e **5 (triagem e apoio à decisão)** parecem os mais próximos do sistema e permitem formular perguntas observáveis sobre os dados e o fluxo de trabalho. Os temas **4, 7 e 8** acrescentam dimensões essenciais de equidade, privacidade e inclusão, e podem ser incorporados como critérios de avaliação ou explorados em estudos próprios.

## Nota sobre o escopo

O GeoAlerta Core documentado no repositório registra ocorrências com GPS, mantém painel municipal com mapa e alertas, permite cruzamento com zonas de risco e oferece exportação CSV autorizada. Integração com previsões hidrológicas, sensoriamento remoto, detecção automática de inundação, alertas públicos à população e índices de vulnerabilidade não devem ser presumidos como parte do produto atual; são possíveis interfaces ou objetos de pesquisa, sujeitos a dados, validação e decisão de escopo.
