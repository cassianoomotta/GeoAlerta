# 06: Anexar e consultar foto privada

**What to build:** O cidadão anexa evidência opcional e o backoffice autorizado a visualiza no detalhe por acesso temporário privado.

**Blocked by:** 03: Abrir ocorrência pública com GPS e triagem; 05: Consultar detalhe e histórico autorizados.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-01, US-05, RF-004, RF-010, RNF-001

**Preparação:** proposta pendente de aprovação da divisão; não publicado no Notion.

- [ ] JPEG, PNG e WebP até 5 MiB são aceitos apenas com extensão, MIME e conteúdo coerentes; arquivos inválidos ou acima do limite são recusados.
- [ ] O upload fica privado e usa token temporário vinculado à tentativa; token alheio não pode associar uma foto a outra ocorrência.
- [ ] Falha de upload informa o problema e permite tentar novamente ou confirmar explicitamente envio sem foto, sem sucesso enganoso ou duplicação.
- [ ] A leitura exige capacidade de dados privados e grupo autorizado; a URL temporária expira em 60 segundos e não é publicada permanentemente.
- [ ] Consulta, acesso anônimo e usuários de outro grupo não obtêm o arquivo ou uma URL autorizada.
- [ ] Testes de navegador, API e Storage real comprovam os fluxos com/sem foto, falhas, adulteração, associação indevida, expiração e negações.

