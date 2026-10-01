# 10: Excluir e restaurar ocorrências logicamente

**What to build:** O Administrador retira uma ocorrência da operação e a restaura com motivo, mantendo dados e trilha de auditoria.

**Blocked by:** 08: Editar e transicionar sem perder alterações.

**Status:** ready-for-agent

**Release:** 0.1.0 (Core)

**Prioridade:** High

**Rastreabilidade:** US-05, RF-012, RF-015

**Publicação:** divisão aprovada pelo usuário e publicada no Notion em 30/09/2026.

**Notion:** [Abrir ticket](https://app.notion.com/p/3ebefe2e57f281e9ac27da527de50b9a?pvs=204)

- [ ] Somente Administrador exclui ou restaura logicamente, no município autorizado e com justificativa obrigatória.
- [ ] A exclusão preserva dados e eventos e remove o registro de lista, mapa, contagens e exportações operacionais; não remove arquivos privados.
- [ ] Uma visão administrativa permite localizar o registro excluído e restaurá-lo; a restauração o devolve às consultas permitidas.
- [ ] Registro excluído não aceita transições; versão, conflitos e rollback de auditoria obedecem ao contrato de mutação.
- [ ] Testes de navegador, API e banco comprovam ocultação, recuperação, preservação, motivos e negações.

### Validação básica durante a história

- [ ] Tipos, lint dos arquivos alterados e testes unitários relevantes aprovados; sem Docker, banco/serviços locais ou dependências novas.
- [ ] Falsos de repositório e autenticação cobrem exclusão/restauração Admin válida, perfil/motivo/registro inválido e falhas de escrita/auditoria; conferir ocultação nas consultas operacionais simuladas.
- [ ] Registrar **implementação concluída e validação básica aprovada**, mantendo o aceite integrado pendente.

### Validação integrada pendente — consolidar na história 20

- [ ] No Supabase de homologação, verificar permissões reais, persistência lógica e auditoria, exclusão de mapa/contagens/CSV, restauração e preservação de foto privada.
- [ ] Simulações não comprovam RLS, grants ou preservação no banco/Storage reais.
