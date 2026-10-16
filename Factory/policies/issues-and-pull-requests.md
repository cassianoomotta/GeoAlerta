# Registro local e publicação humana opcional

A fonte de acompanhamento é `Factory/missions/`. Toda demanda recebe registro proporcional contendo objetivo, escopo, critérios, decisões, validações e resultado. Mudanças também recebem entradas no ledger. Consultas podem usar registro curto sem PR vazio, issue obrigatória ou processo completo de implementação.

## Git e GitHub

Issues e PRs não são pré-requisitos para iniciar, validar ou entregar trabalho local. O coordenador não publica issues, PRs, comentários ou atualizações remotas nesta rotina. Pode preparar texto local quando solicitado. Os templates em `.github/` são opcionais para uso do usuário.

É proibido à IA executar `git commit`, `git push`, `git merge`, equivalentes por API e deploys em produção/Vercel. Somente o usuário revisa, commita, publica e integra. Não aguarde merge ou fechamento de issue para considerar a entrega tecnicamente pronta; use `awaiting_review` após QA e `completed` após aceite humano explícito do resultado.

Antes de editar, confira branch e alterações locais. Não troque nem descarte trabalho do usuário. Se uma nova branch for necessária, respeite as instruções vigentes e prefira `codex/`; não crie branch apenas por formalidade. Esta política não autoriza alterar a política de segurança ou os controles de publicação.

Caso o usuário publique artefatos externos, eles podem ser referências adicionais na missão; o registro local continua suficiente. O arquivo conserva o nome importado para preservar referências existentes.
