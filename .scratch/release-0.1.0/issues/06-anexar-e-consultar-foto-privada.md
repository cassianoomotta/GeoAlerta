# 06: Anexar e consultar foto privada

**What to build:** O cidadão anexa evidência opcional e o backoffice autorizado a visualiza no detalhe por acesso temporário privado.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-01, US-05, RF-004, RF-010, RNF-001

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f2814d8057fca83c7d6ad1?pvs=204)

- [ ] JPEG, PNG e WebP até 5 MiB são aceitos apenas com extensão, MIME e conteúdo coerentes; arquivos inválidos ou acima do limite são recusados.
- [ ] O upload fica privado e usa token temporário vinculado à tentativa; token alheio não pode associar uma foto a outra ocorrência.
- [ ] Falha de upload informa o problema e permite tentar novamente ou confirmar explicitamente envio sem foto, sem sucesso enganoso ou duplicação.
- [ ] A leitura exige capacidade de dados privados e grupo autorizado; a URL temporária expira em 60 segundos e não é publicada permanentemente.
- [ ] Consulta, acesso anônimo e usuários de outro grupo não obtêm o arquivo ou uma URL autorizada.
- [ ] Testes de navegador, API e Storage real comprovam os fluxos com/sem foto, falhas, adulteração, associação indevida, expiração e negações.

### Validação básica durante a história

- [ ] Tipos conferidos, lint executado nos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco local, serviço Supabase local ou dependência nova.
- [ ] Testes de domínio validam extensão/MIME/conteúdo e limite de 5 MiB, inclusive entradas inválidas.
- [ ] Implementações falsas de armazenamento, repositório e autorização cobrem sucesso, arquivo/tentativa inválidos, falha de upload e negação de acesso; isso não comprova privacidade real do Storage.
- [ ] O estado pode ser descrito como **implementação concluída e validação básica aprovada**; aceite integrado permanece pendente.

### Validação integrada pendente — consolidar na história 20

- [ ] Em projeto Supabase exclusivo de homologação, validar bucket privado, upload/retomada, associação por tentativa, URL temporária/expiração e leitura/negação por conta e grupo reais.
- [ ] Adaptar fixtures e preparar contas, permissões e buckets antes da execução; trocar apenas a URL não basta. Mocks não contam como prova de Storage/RLS/Auth.
