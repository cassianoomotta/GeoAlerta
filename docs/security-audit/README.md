# Auditoria de segurança

Materiais históricos; os achados precisam ser revalidados contra o checkout e o banco de teste. As permissões da release Core são definidas no [PRD atual](../releases/core/PRD.md).

| Arquivo | Conteúdo |
|---|---|
| [github-issues.md](github-issues.md) | Propostas históricas de issues sobre RLS, autenticação, acesso a objetos e arquivos. |
| [relatorio-auditoria-seguranca.pdf](relatorio-auditoria-seguranca.pdf) | Relatório visual da auditoria anterior, preservado em PDF. |
| [generate_report.py](generate_report.py) | Gerador do relatório histórico. |
| [migrate.js](migrate.js) | Script histórico que altera banco; não integra o fluxo Prisma Migrate e não deve ser executado como parte deste planejamento. |
| `package.json`, `package-lock.json` | Dependências do material de auditoria. |

O script histórico contém uma conexão embutida e precisa de revisão pelo usuário antes de qualquer uso; credenciais não devem ser reproduzidas nos documentos, logs ou testes. A documentação atual não executa scripts nem aplica alterações em bancos externos.
