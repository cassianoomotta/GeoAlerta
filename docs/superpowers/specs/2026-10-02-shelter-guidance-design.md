# Orientação para abrigos após registro de ocorrência

**Status:** aprovada, implementada e migration remota aplicada após reconciliação de histórico
**Data:** 2026-10-02

## Objetivo

Após registrar qualquer tipo de ocorrência pública, o cidadão poderá consultar os abrigos ativos e abertos do município e abrir uma rota para o local no Google Maps ou no Waze. A orientação é independente do tipo de ocorrência.

O painel permitirá que Administradores cadastrem, editem, ativem, desativem e excluam abrigos sem reativar o módulo legado de pessoas acolhidas.

## Decisões aprovadas

- Usar a tabela existente `public.shelters`; não criar uma segunda tabela de catálogo de abrigos.
- Trabalhar somente com informações dos abrigos nesta funcionalidade. Não criar fluxo de cadastro ou administração de `shelter_people`.
- Somente papel `ADMINISTRADOR` pode administrar abrigos.
- A confirmação pública exibe somente abrigos ativos cuja situação operacional seja `Aberto`.
- A lista aparece após a confirmação de qualquer tipo de ocorrência, independentemente da categoria.
- Manter ativos os registros de abrigo que já existem. A leitura agregada de 2026-10-02 encontrou dois registros para `sa_patrulha`: um `Aberto` e um `Lotado`; ambos tinham endereço e coordenadas válidos. Na lista pública inicial, somente o registro `Aberto` será exibido.
- Permitir exclusão permanente somente quando não houver registros vinculados em `shelter_people`. Caso haja vínculo, bloquear a exclusão e permitir desativação.
- O cidadão recebe links de destino para Google Maps e Waze. Os links de origem fornecidos ao cadastrar um abrigo devem ser reconhecidos como destinos de mapa e normalizados para latitude/longitude; endereços curtos ou ambíguos sem destino verificável devem exigir coordenadas manuais.

## Dados e segurança

Adicionar `is_active BOOLEAN NOT NULL DEFAULT TRUE` a `public.shelters`, preservando os valores e a situação atual de todos os registros. `is_active` controla a ativação administrativa; a publicação no catálogo público exige também que `status = 'Aberto'`.

O cadastro exige nome, endereço, tipo e uma localização utilizável. Latitude e longitude devem ser informadas juntas e estar dentro dos limites WGS84, ou devem ser extraídas de um link Google Maps/Waze reconhecível. Abrigos ativos precisam ter endereço não vazio e coordenadas válidas. A capacidade e a ocupação, quando informadas, não podem ser negativas. O estado `is_active` e a situação operacional são editáveis separadamente.

A rota administrativa proposta é `/painel/admin/abrigos`, ligada à área Core de administração e protegida no servidor por sessão atual e capacidade `administer`. As operações de criação, edição, mudança de situação, ativação, desativação e exclusão geram eventos de auditoria. Não haverá exclusão em cascata: a restrição de chave estrangeira de `shelter_people` será endurecida para impedir que apagar um abrigo apague registros associados. O módulo e as políticas de leitura/escrita de `shelter_people` continuam desativados.

A migração remove o bloqueio legado somente de `shelters`, concede os privilégios mínimos aos papéis restritos Core e define RLS separada: o papel de ingestão pode ler somente abrigos ativos do município, e o papel runtime só pode administrar linhas do município em sessão de Administrador. Não serão concedidos acessos públicos diretos via Data API nem usados segredos de serviço no navegador.

## Fluxo público

1. O formulário envia e persiste a ocorrência como hoje.
2. Depois que o servidor confirma o registro, a página apresenta o protocolo e o status.
3. Após qualquer ocorrência ser confirmada, a página chama um endpoint público de consulta de abrigos com `Cache-Control: no-store`.
4. O endpoint retorna somente abrigos com `is_active = true` e `status = 'Aberto'`, e apenas os campos identificador público, nome, tipo, endereço, latitude, longitude e situação. Capacidade/ocupação, telefone, responsável, observações e dados de pessoas acolhidas não são retornados ao cidadão.
5. Cada abrigo listado é exibido como aberto e tem links de rota para Google Maps e Waze construídos a partir das coordenadas validadas. Abrigos inativos, `Lotado` ou `Encerrado` não aparecem.
6. Se não houver abrigos ativos e abertos, a confirmação informa isso sem afetar o protocolo. Se a consulta falhar, mantém o registro confirmado e permite tentar carregar os abrigos novamente.

## Fluxo administrativo

A tela administrativa lista nome, endereço, tipo, situação, capacidade/ocupação e estado ativo. O Administrador pode criar ou editar esses campos e ativar/desativar um abrigo. O formulário exige localização utilizável antes da ativação.

O Administrador pode excluir um abrigo sem vínculos em `shelter_people`. Se o banco impedir a exclusão por vínculo existente, a interface explica que o registro relacionado foi preservado e oferece desativação do abrigo. Não será adicionada interface para consultar ou alterar as pessoas vinculadas.

## Falhas e integridade

- A falha da consulta de abrigos nunca reverte nem duplica uma ocorrência já confirmada.
- Atualizações administrativas validam todos os campos no servidor e usam consultas parametrizadas.
- O banco impede que um abrigo ativo tenha coordenadas incompletas/fora do intervalo e bloqueia a exclusão com registros relacionados.
- A interface identifica explicitamente a situação operacional para não confundir `ativo` com `Aberto`.

## Verificação prevista

- Testes unitários para validação de cadastro/edição, pares de coordenadas, parsing de links de mapa e construção dos dois destinos de rota.
- Testes de banco para migração aditiva, preservação dos registros existentes, valor ativo padrão, restrição de exclusão com vínculo, RLS para Administrador e negação para os demais papéis.
- Testes de API para a lista pública limitada a abrigos ativos e `Aberto`, whitelisting de campos, operações administrativas e negativas de acesso.
- Teste E2E para mais de um tipo de ocorrência exibindo protocolo, abrigos, situação e links; erro/ausência de abrigos não apaga a confirmação.
- Executar e validar primeiro a migração no Docker descartável/local. Após o usuário autorizar a aplicação remota, reconciliar as migrations cujo efeito já estava confirmado, aplicar as migrations de abrigo e verificar dados, grants, RLS e chave estrangeira no Supabase GeoAlerta.

## Fora do escopo

- Gestão de pessoas acolhidas, CPF, animais, check-in ou check-out.
- Exibir ao cidadão abrigos inativos, `Lotado` ou `Encerrado`.
- Integração bidirecional com planilhas ou serviços de geocodificação para resolver endereços arbitrários.
