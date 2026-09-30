# 14: Consultar e atualizar o próprio perfil

**What to build:** A conta ativa consulta seus dados e atualiza nome, telefone e preferências sem alterar o próprio acesso.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** Medium

**Rastreabilidade:** US-02, RF-006, RNF-001

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

**Decisão de escopo/dependência:** Não depende da lista: utiliza o contrato comum de preferências da base e um adaptador mínimo.

- [ ] O perfil exibe identificação, e-mail institucional, papel, grupos e estado atuais; apenas nome, telefone e preferências próprios são editáveis.
- [ ] Não é possível trocar e-mail institucional, papel, grupos ou estado pelo perfil, nem modificar outra conta com parâmetro adulterado.
- [ ] Preferências continuam restritas a colunas permitidas, armazenadas por usuário e compartilháveis com a futura lista sem ampliar leitura.
- [ ] API e banco negam conta não ativa, inclusive com sessão anterior; validação e feedback de erro/sucesso funcionam.
- [ ] Testes de navegador, API e banco verificam dados persistidos, limites de edição e tentativas de promoção indevida.

