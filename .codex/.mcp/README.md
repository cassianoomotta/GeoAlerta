# Catálogo de MCPs recomendados

`servers.toml` guarda configurações de referência para os MCPs escolhidos para a factory. O Codex não descobre configurações automaticamente nesta pasta: ele carrega MCPs de `[mcp_servers.*]` em `.codex/config.toml` (configuração do projeto) ou `~/.codex/config.toml` (configuração pessoal). Copie somente os blocos necessários para a configuração suportada ou registre o servidor com `codex mcp add`.

## Recomendações

- **GitHub**: consulta opcional de referências e checks; publicação é humana. O exemplo usa o container oficial. Forneça `GITHUB_PERSONAL_ACCESS_TOKEN` pelo ambiente local; nunca grave token neste repositório. Mantenha aprovação de ferramentas em `prompt`.
- **Context7**: busca de documentação atual de bibliotecas. É transversal a projetos.
- **Supabase**: incluído desativado e somente leitura, com placeholder para `project_ref`. Substitua pelo ID do projeto antes de ativar; mantenha os grupos de ferramentas limitados. Use um projeto de desenvolvimento para operações de escrita quando necessário.
- **Vercel**: somente consulta quando necessária. A IA nunca dispara deploys em produção/Vercel.
- **Playwright**: automação e investigação de fluxos de UI.
- **Chrome DevTools**: depuração de console, rede e desempenho. Complementa Playwright; não é necessário habilitar ambos para cada missão.

Todos os servidores de exemplo ficam `enabled = false` para que a simples cópia do catálogo não habilite ferramentas externas sem escolha explícita. Após selecionar servidores, configure suas aprovações e autenticação de acordo com a menor permissão necessária. Não versionar chaves, tokens, IDs de conta privados ou segredos.

## Ativação no Codex

A configuração oficial é o `config.toml`. Para ativar um servidor, copie seu bloco `[mcp_servers.<id>]` e tabelas filhas de `servers.toml` para `.codex/config.toml` (projeto confiável) ou para `~/.codex/config.toml` (pessoal). Revise primeiro as permissões e dependências locais. Veja a [documentação do MCP no Codex](https://developers.openai.com/codex/mcp/) e a [referência de configuração](https://developers.openai.com/codex/config-reference).

Acompanhamento local não requer MCPs externos. Este catálogo não autoriza ativação, publicação ou instalação. Variáveis locais pertencem exclusivamente ao `.env` da raiz; não versionar valores nem expor segredos.
