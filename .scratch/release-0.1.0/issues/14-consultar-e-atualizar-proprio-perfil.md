# 14: Consultar e atualizar o próprio perfil

**What to build:** A conta ativa consulta seus dados e atualiza nome, telefone e preferências sem alterar o próprio acesso.

**Blocked by:** 02: Entrar no painel com acesso por papel e grupo.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** Medium

**Rastreabilidade:** US-02, RF-006, RNF-001

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281af9165d744c51c2867?pvs=204)

**Decisão de escopo/dependência:** Não depende da lista: utiliza o contrato comum de preferências da base e um adaptador mínimo.

- [ ] O perfil exibe identificação, e-mail institucional, papel, grupos e estado atuais; apenas nome, telefone e preferências próprios são editáveis.
- [ ] Não é possível trocar e-mail institucional, papel, grupos ou estado pelo perfil, nem modificar outra conta com parâmetro adulterado.
- [ ] Preferências continuam restritas a colunas permitidas, armazenadas por usuário e compartilháveis com a futura lista sem ampliar leitura.
- [ ] API e banco negam conta não ativa, inclusive com sessão anterior; validação e feedback de erro/sucesso funcionam.
- [ ] Testes de navegador, API e banco verificam dados persistidos, limites de edição e tentativas de promoção indevida.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de autenticação e repositório cobrem leitura/edição próprias, campos protegidos ou usuário alheio e falha de gravação; validar formato e limites de entrada.
- [ ] Registrar **implementação concluída e validação básica aprovada**, com aceite integrado pendente.

### Validação integrada pendente — consolidar na história 20

- [ ] No projeto Supabase de homologação, verificar persistência do perfil e preferências, identidade Auth real e negação de campos/contas alheios por API e RLS.
- [ ] Mocks não comprovam autorização nem isolamento de dados reais.
