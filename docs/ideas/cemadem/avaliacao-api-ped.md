# Avaliação de integração com a API do Cemaden (PED)

**Data da avaliação:** 13/10/2026  
**Escopo:** investigar uma integração de chuva acumulada de 24, 48 e 72 horas no GeoAlerta, priorizando a API PED em vez de scraping da página do gráfico.

## Conclusão

A PED é adequada para fornecer acumulados de 24, 48 e 72 horas. O Swagger publicado pelo Cemaden documenta os serviços `GET /pcds-acum/acumulados-recentes` e `GET /pcds-acum/acumulados-historicos`, que já retornam esses intervalos como `acc24hr`, `acc48hr` e `acc72hr`. O endpoint recente também devolve o horário da medição (`datahora`). Assim, o GeoAlerta não precisa reconstruir esses acumulados lendo pontos do gráfico.

O uso em produção depende de obter credenciais e confirmar com o Cemaden o fluxo atual de emissão do JWT, limites de consulta e condições de uso. A especificação exige um header `token` e descreve-o como JWT emitido por `/controle-token/tokens`, mas esse serviço de autenticação não aparece entre os caminhos definidos no Swagger aberto nesta avaliação. Não foi possível validar a emissão de token nem executar uma consulta autenticada.

## O que foi verificado

- O [Swagger oficial da PED](https://sws.cemaden.gov.br/PED/api/ui/) publica o documento [`swagger.json`](https://sws.cemaden.gov.br/PED/api/ui/swagger.json), versão 2.0.2, com base `/PED/rest/`.
- A resposta de acumulados recentes exemplifica `acc24hr`, `acc48hr`, `acc72hr`, `codestacao`, `codibge`, `id_estacao` e `datahora`.
- Para o endpoint recente, `codibge` é obrigatório; `codestacao` e `idestacao` são parâmetros opcionais. Para o histórico, `codibge` e `data` são obrigatórios. A data usa `aaaaMMddHHmm`.
- As chamadas documentadas exigem o JWT no header HTTP `token`. O Swagger diz que o token vem de `/controle-token/tokens`, mas não documenta os parâmetros nem o método de autenticação.
- O relatório oficial de gestão do Cemaden descreve a PED como uma plataforma com cadastro/login do usuário e emissão/controle transparente de token em segundo plano. Isso sustenta o uso do portal e do canal oficial para obter acesso, mas não substitui a confirmação do fluxo de credenciais para uma integração servidor-servidor.
- O [FAQ oficial do Cemaden](https://www2.cemaden.gov.br/contato-cemaden/) aponta o Mapa Interativo para visualização quase em tempo real. Ele não documenta o fluxo de credenciais da PED.

## Endpoints relevantes

| Objetivo | Endpoint | Parâmetros importantes | Uso no GeoAlerta |
|---|---|---|---|
| Acumulados mais recentes | `GET https://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-recentes` | Header `token`; `codibge` obrigatório; opcional `codestacao` ou `idestacao`; `formato=JSON` | Cartão do painel com 24 h, 48 h e 72 h da estação, junto ao horário de referência. |
| Acumulados em data passada | `GET https://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-historicos` | Header `token`; `codibge` e `data=aaaaMMddHHmm` obrigatórios; estação opcional | Investigar retrospectivamente um evento ou comparar os valores de um horário específico. |
| Metadados de estações | `GET https://sws.cemaden.gov.br/PED/rest/pcds-cadastro/dados-cadastrais` | Header `token`; filtros opcionais `uf`, `codibge`, `codestacao`, `tipoestacao` | Obter coordenadas, nome, cidade, código e horário da última remessa para escolher estações próximas. |

Os acumulados são janelas móveis calculadas a partir da última medição recebida (ou da data de referência, no endpoint histórico). Eles são diferentes de chuva do dia civil. A tela deve exibir a estação usada, o horário da medição e um indicador de dado desatualizado quando apropriado.

Exemplo ilustrativo, sem credencial:

```http
GET /PED/rest/pcds-acum/acumulados-recentes?codibge=<IBGE>&formato=JSON
Host: sws.cemaden.gov.br
token: <JWT fornecido pelo fluxo oficial>
```

## Página do gráfico e DevTools

O gráfico informado é `grafico_pcds.php?idpcd=17732&hr=24&dia=860`. A tentativa de abrir o Chrome MCP para capturar a aba Network não pôde prosseguir: o ambiente de Computer Use informou que as permissões de Acessibilidade e Gravação de Tela não foram concedidas. Portanto, esta avaliação **não afirma ter capturado nem verificado as chamadas de rede dessa página**. A URL observada confirma somente os parâmetros de página `idpcd`, `hr` e `dia`; não prova que o gráfico consuma a PED.

O caminho de integração recomendado não depende de descobrir ou reutilizar o token de uma sessão do navegador do Cemaden. Um token visto no DevTools é credencial temporária e não deve ser copiado para o GeoAlerta nem exposto no frontend. A página do gráfico também pode usar um serviço legado distinto da PED.

## Fluxo recomendado para o GeoAlerta

1. Solicitar ao Cemaden acesso à PED para uso institucional pelo GeoAlerta e confirmar endpoint, parâmetros e política de atualização/autenticação vigentes. A documentação aponta o canal `dti@cemaden.gov.br` em um exemplo de implantação municipal, mas esse endereço precisa ser confirmado no contato institucional atual.
2. Manter usuário/senha de serviço e JWT somente no servidor, em variáveis do `.env` da raiz, conforme a regra do projeto. Não enviar credenciais ao navegador nem registrar JWT em logs.
3. Fazer a API do GeoAlerta atualizar em lote os metadados das estações e consultar acumulados recentes em intervalos razoáveis; persistir/cachear a resposta para que visitas ao painel não multipliquem chamadas à PED.
4. Associar a ocorrência às estações pluviométricas próximas usando as coordenadas da estação e da ocorrência, mostrando distância e qualidade/atualidade da medição. Se não houver estação com dado recente próximo, mostrar indisponibilidade em vez de inferir chuva zero.
5. Mostrar `acc24hr`, `acc48hr`, `acc72hr` com unidade mm, horário da observação e estação de origem. Tratar ausência de medição, valor nulo e falha do serviço como estados distintos de zero.
6. Tratar esses dados como observação de chuva para apoio à triagem. Um acumulado isolado não deve, sem limiares e validação operacional, criar alerta oficial ou substituir as regras geográficas de inundação do GeoAlerta.

## Pendências antes da implementação

- Confirmar com o Cemaden o procedimento oficial de cadastro e geração/renovação do token para serviço de backend e se o caminho citado pelo Swagger continua ativo.
- Confirmar cotas, frequência permitida, validade do token e política de armazenamento/redistribuição dos dados.
- Com acesso autorizado ao Chrome MCP, registrar a Network da página do gráfico para comparação técnica; isso pode revelar um serviço legado ou uma chamada diferente, mas não é pré-requisito se a PED atender aos dados e à cobertura requeridos.
- Com credenciais autorizadas, fazer uma chamada de teste a uma estação de interesse e verificar latência, disponibilidade, fuso horário, nulos e divergências com o gráfico.

## Fontes

- [Swagger UI da Plataforma de Entrega de Dados](https://sws.cemaden.gov.br/PED/api/ui/)
- [Especificação OpenAPI/Swagger da PED (JSON)](https://sws.cemaden.gov.br/PED/api/ui/swagger.json)
- [Relatório de gestão do Cemaden 2023 (MCTI), seção sobre a PED](https://www.gov.br/cemaden/pt-br/acesso-a-informacao/institucional-1/termo-de-compromisso-de-gestao/relatorio_tcg_2023-cemadenfim_240904_110253.pdf/%40%40download/file)
- [FAQ e contato oficial do Cemaden](https://www2.cemaden.gov.br/contato-cemaden/)
- [Repositório público municipal de Garopaba com referência prática ao processo de credenciamento](https://github.com/governodegaropaba/defesacivil) (fonte secundária; validar tudo diretamente com o Cemaden).

## Comparação com a Rede Hidrometeorológica da Defesa Civil do RS

### Evidência local em Santo Antônio da Patrulha

Na página do gráfico aberta durante esta avaliação, o Cemaden identifica a estação `G2-431760801A` como pluviométrica e localizada em Santo Antônio da Patrulha/RS. A página mostra atualização em `14/10/2026 02h UTC` (23h de 13/10 no horário de Brasília) e um gráfico de acumulado de 24 horas. Isso confirma cobertura do Cemaden para chuva nesse município e, neste caso, uma observação horária recente. É uma medição de uma estação, não uma média representativa de todo o município.

### Comparação prática

| Critério | Cemaden | Rede Hidrometeorológica RS |
|---|---|---|
| Variáveis confirmadas | Chuva pluviométrica; a PED informa acumulados de 24, 48 e 72 horas. | Chuva e nível/tendência do rio, além de outras variáveis meteorológicas. |
| Acesso programático | A PED documenta API REST para acumulados, com JWT obrigatório. A página pública de gráficos é uma interface de visualização, não a documentação da API. | A Defesa Civil do RS documenta API GraphQL e subscriptions WebSocket no endpoint `/graphql`. |
| Santo Antônio da Patrulha | A estação `G2-431760801A` aparece explicitamente no gráfico aberto. | A documentação consultada não prova quais estações operacionais existem no município. O exemplo de filtro geográfico publicado demonstra UF, mas não um filtro municipal específico. |
| Atualização e qualidade | Segundo o Cemaden, a transmissão costuma ser a cada 10 minutos durante chuva e a cada 60 minutos sem chuva. O próprio órgão alerta que dados do Mapa Interativo são brutos e podem conter inconsistências; recomenda observar falhas, lacunas, horários e valores espúrios. | A documentação diz que os dados chegam conforme cada estação transmite e que o menor intervalo varia por equipamento/sensor. Não encontrei uma especificação pública equivalente sobre controle de qualidade e falhas. |
| Melhor uso no GeoAlerta | Complementar precipitação local e contextualizar chuva acumulada, informando estação e horário. | Fonte mais apropriada para nível de rio e para combinar chuva com condição hidrológica estadual, quando houver estação próxima e dado recente. |

### Assertividade: o que dá e não dá para concluir

Não há evidência pública suficiente nesta avaliação para dizer que uma rede mede com maior exatidão. O Cemaden explicita uma limitação relevante: os dados apresentados pelo Mapa Interativo são brutos, sem tratamento, e podem conter inconsistências. Para a API estadual, a página de documentação descreve atualização e campos, mas não publica métricas de validação nem uma avaliação comparativa de sensores. Portanto, não se deve tratar a presença de uma API estadual como prova de maior qualidade, nem a cobertura nacional do Cemaden como prova de maior precisão num ponto específico.

Uma comparação de precisão exigiria séries simultâneas de estações próximas e parâmetros compatíveis: mesma janela e unidade para precipitação; para cotas de rio, mesmo referencial vertical ou cotas de alerta definidas pela própria estação. Deve-se medir lacunas, atraso, valores fora de faixa e divergência entre instrumentos. Distância e representatividade hidrológica também importam: duas estações no mesmo município podem registrar chuvas bem diferentes, e uma estação de nível deve ser associada ao trecho/bacia relevante.

### Recomendação

Usar as duas fontes de forma complementar, sem fundir as leituras como se fossem um único sensor:

1. Para uma ocorrência, selecionar as estações de chuva mais próximas e mostrar nome/código, distância, acumulados de 24/48/72 h e horário da última leitura.
2. Consultar a rede estadual para nível/tendência do rio na estação hidrologicamente relevante e exibir as cotas/limiares oficiais daquela estação.
3. Sinalizar separadamente dado atrasado, sem leitura e valor zero; nunca converter ausência de dados em `0 mm`.
4. Confirmar com a Defesa Civil do RS as condições de uso da API em produção pública/comercial. A documentação da API faz esse pedido expressamente.
5. Antes de criar regra automática de alerta, validar os acumulados e limiares com a Defesa Civil/local e medir a qualidade dos dados em um período de operação paralela.

### Fontes adicionais

- [Pluviômetros automáticos do Cemaden: frequência de transmissão, dados brutos e possíveis inconsistências](https://www2.cemaden.gov.br/pluviometros-automatico/)
- [Perguntas frequentes da rede observacional do Cemaden](https://www.gov.br/cemaden/pt-br/rede-observacional/perguntas-frequentes)
- [Documentação da API da Rede Hidrometeorológica da Defesa Civil RS](https://sistemas.defesacivil.rs.gov.br/api-redehidrometeorologica)
- [Mapa da Rede Hidrometeorológica do RS](https://redehidrometeorologica.defesacivil.rs.gov.br/Mapa)
