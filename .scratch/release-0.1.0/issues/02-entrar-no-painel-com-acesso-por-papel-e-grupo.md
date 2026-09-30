# 02: Entrar no painel com acesso por papel e grupo

**What to build:** Uma conta administrativa ativa entra e sai do painel com capacidades e grupos verificados; contas sem autorização são recusadas em toda operação protegida.

**Blocked by:** 01: Preparar a base Core preservando o legado.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-02, RF-005, RNF-001

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] Login válido de conta ATIVO e logout funcionam; ausência de sessão, credenciais inválidas e contas PENDENTE, SUSPENSO ou DESATIVADO impedem acesso protegido, inclusive com sessão anterior.
- [ ] A matriz de Consulta, Operador, Gestor e Administrador combina capacidades, grupos e município, incluindo contas sem grupo e com múltiplos grupos; não há autocadastro público de operadores.
- [ ] A API verifica identidade e estado atual no lado confiável; papel e grupo recebidos do navegador ou user_metadata não concedem acesso.
- [ ] Prisma opera com role de execução sem BYPASSRLS e contexto local à transação; conexões reutilizadas, erros e rollback não conservam identidade de outra conta.
- [ ] RLS e grants reais impedem leitura cruzada e escrita direta nas tabelas Core por anon/authenticated; Consulta não lê dados privados diretamente no banco.
- [ ] Os erros de autenticação, capacidade e ID fora do escopo respeitam o contrato da release e não revelam dados privados.
- [ ] Testes de navegador, API, banco e permissões comprovam os casos concedidos e negados com identidades reais de aplicação, sem conexão administrativa como prova de RLS.

