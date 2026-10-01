# GeoAlerta — release Core

**Estado:** proposta de produto para revisão. Estes documentos descrevem a próxima release; não afirmam que ela já foi implementada.

Esta release concentra o GeoAlerta em dois recursos: abertura pública de ocorrências e gestão de ocorrências no painel. O cidadão envia sem criar conta. O backoffice exige login e autorização por papel e grupo.

## Documentos

- [PRD](PRD.md): escopo, histórias de usuário, cenários BDD e critérios de aceite.
- [Histórias e requisitos](requirements.md): sete histórias com critérios de aceite e IDs estáveis de requisitos funcionais e não funcionais.
- [Arquitetura](architecture/README.md): monólito modular, limites hexagonais, contratos e integração Prisma/Supabase.
- [Banco de dados](database/README.md): estratégia Prisma Migrate, baseline do legado, PostGIS, RLS e conexões.
- [Testes automatizados](testing/README.md): validação básica por história e aceite integrado no Supabase de homologação.
- [Plano de implementação por agentes](../../superpowers/plans/2026-09-29-geoalerta-core.md): arquivos, interfaces, dependências, tarefas e evidências de validação.

Os arquivos em `Core/` e o README da raiz descrevem a versão anterior, mais ampla. Em caso de conflito sobre o **escopo da próxima release**, este diretório prevalece. `AGENTS.md` continua prevalecendo para regras de negócio, ambiente e governança.

## Fluxo de trabalho

1. Revisar e aprovar o PRD e as premissas de capacidade.
2. Revisar arquitetura, migrations Prisma e planejamento de testes; os documentos desta pasta são as specs da release.
3. Durante cada história, conferir tipos, lint dos arquivos alterados e testes unitários relevantes, usando doubles quando aplicável; não exigir Docker, banco/serviços locais ou novas dependências.
4. Fazer builds em marcos de integração e no fechamento. No fechamento, executar o aceite integrado no projeto Supabase exclusivo de homologação e registrar evidência por história/requisito.
5. Distinguir implementação com validação básica aprovada de aceite integrado concluído. Revisar cada entrega e registrar pendências; só o usuário revisa para integração, faz commit, push, merge e deploy.

As fatias são: fundação de dados e RBAC; abertura pública; lista/CSV; detalhe/ciclo de vida; dashboard; administração/perfil; desativação do legado. Cada uma deve terminar verificável. Esta atualização altera documentação; não instala Prisma/Playwright nem aplica migrations.
