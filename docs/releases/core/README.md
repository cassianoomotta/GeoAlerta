# GeoAlerta Core 0.1.0

**Estado documental:** escopo de referência para a linha estável `geo-alerta-0-1-0`; aceite integrado final e publicação da release não declarados. A Task 20 permanece pausada e a Task 30, de auditoria, está em andamento.

O Core 0.1.0 reúne o registro público de ocorrências e o painel municipal autenticado para indicadores, mapa, alertas in-app, lista/detalhe e operações autorizadas, com exportação local em CSV. A administração municipal inclui acessos, status, zonas de risco e abrigos. O cidadão registra sem conta; o backoffice exige login e autorização por papel e grupo. Módulos legados desativados e fluxos pendentes estão identificados no [guia operacional](guia-operacional.md).

## Documentos

- [Guia operacional](guia-operacional.md): descreve recursos atualmente implementados, passos por perfil, resultados esperados, recuperação de falhas e limitações. Não representa aceite de produção.
- [PRD](PRD.md): escopo, histórias de usuário, cenários BDD e critérios de aceite.
- [Histórias e requisitos](requirements.md): sete histórias com critérios de aceite e IDs estáveis de requisitos funcionais e não funcionais.
- [Arquitetura](architecture/README.md): monólito modular, limites hexagonais, contratos e integração Prisma/Supabase.
- [Banco de dados](database/README.md): estratégia Prisma Migrate, baseline do legado, PostGIS, RLS e conexões.
- [Testes automatizados](testing/README.md): validação básica por história e aceite integrado no Supabase de homologação.
- [Plano de implementação por agentes](../../superpowers/plans/2026-09-29-geoalerta-core.md): arquivos, interfaces, dependências, tarefas e evidências de validação.

O PRD, os requisitos, a arquitetura e os planos abaixo são especificações e evidências de trabalho; não são, isoladamente, prova de que um fluxo está disponível ou validado em todos os serviços. Use o guia operacional para as funções verificadas no código e os documentos de estabilidade para ver a evidência e os limites. Os módulos antigos de `Core/` são referências históricas. `AGENTS.md` continua prevalecendo para regras de negócio, ambiente e governança.

## Manutenção e validação

- Use o guia operacional para instruções de uso; mantenha-o alinhado à interface e aos critérios efetivamente aceitos.
- Use o PRD, os requisitos e a arquitetura como especificações. Ao mudar um fluxo, atualize também os testes relevantes e registre evidência sanitizada nos documentos de estabilidade.
- Separe validação local/isolada de validação integrada com serviços reais. Fixture, build ou inspeção de código não prova estado de produção.
- Não coloque credenciais ou dados reais na documentação. Alterações em ambientes compartilhados, commit, push, merge e deploy cabem exclusivamente ao usuário.
- A Task 20 está pausada e a Task 30 permanece em andamento; o guia assinala essas pendências e esta documentação não declara o aceite final da versão.
