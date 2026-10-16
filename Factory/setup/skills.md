# Skills da factory: descoberta, uso e instalação

Este guia orienta CEO e subagentes a encontrar e usar skills durante as missões e prepara o bootstrap no **Codex neste repositório**. A instalação do bootstrap é local ao projeto; não requer instalação global do pacote `skills` e não altera o `package.json` da aplicação.

A tabela de bootstrap registra o conjunto previsto para instalação, não o inventário real de cada sessão. Skills fornecidas pelo runtime, por plugins ou instaladas posteriormente também podem ser pertinentes.

## Descoberta e uso em cada missão

1. **Consultar a disponibilidade.** No início da tarefa e quando a necessidade mudar, examine o catálogo de skills fornecido à sua própria sessão: nome, descrição e caminho ou identificador. Consulte também os metadados dos `SKILL.md` em `.agents/skills/`, quando essa pasta existir. Use os caminhos apresentados pelo runtime para skills pessoais, de plugins ou de outras origens; não suponha uma pasta global fixa. Não é necessário ler todas as instruções completas.
2. **Selecionar pelo contexto.** Compare a finalidade da tarefa com a descrição e os limites da skill. Considere uma skill explicitamente pedida pelo usuário. Não selecione apenas por coincidência de palavra e não execute todas as skills do bootstrap em toda missão. Se nenhuma ajudar, siga as instruções normais da factory.
3. **Ler antes de usar.** Abra o `SKILL.md` selecionado pelo mecanismo de acesso indicado na sessão. Leia recursos referenciados somente quando necessários, resolvendo caminhos relativos à pasta da skill. Respeite dependências, restrições de invocação, ferramentas disponíveis e instruções superiores. Arquivo legível não significa skill habilitada nem acesso concedido a uma ferramenta.
4. **Comunicar e delegar.** Ao aplicar uma skill pela primeira vez na missão, informe brevemente nome e finalidade. O CEO inclui nome, localização e finalidade das skills pertinentes na tarefa delegada. Cada destinatário confirma disponibilidade e lê as instruções no próprio contexto; não presume que herdou a leitura ou o catálogo do CEO. No retorno, informe as skills utilizadas e limitações que afetaram a entrega, sem copiar instruções ou dados sensíveis.
5. **Tratar indisponibilidade.** Diferencie ausência do arquivo, skill não exposta ou desabilitada e dependência/ferramenta indisponível. Não reinstale, habilite ou conceda acesso automaticamente. Para uma skill opcional, use uma alternativa disponível e suficiente e informe a substituição. Se a skill explicitamente exigida for indispensável, comunique ao CEO e bloqueie a parte dependente, continuando o trabalho independente. Nunca afirme ter aplicado uma skill que não conseguiu ler ou executar.

A [documentação oficial de skills do Codex](https://learn.chatgpt.com/docs/build-skills) explica que a descoberta usa nome, descrição e caminho, carregando o corpo do `SKILL.md` quando necessário. O Codex procura skills locais em `.agents/skills` do diretório de trabalho até a raiz do repositório. Mudanças são detectadas automaticamente; se uma skill recém-instalada não aparecer, confira os arquivos e a configuração de habilitação e reinicie o Codex quando necessário. Respeite restrições de invocação explícita definidas pela skill; a inspeção local não contorna uma desabilitação.

## Novas skills ao longo do projeto

A regra de descoberta é dinâmica: uma nova skill disponível participa da mesma seleção por metadados, sem adicionar seu nome aos quatro arquivos de papéis. Para torná-la parte do bootstrap compartilhado, atualize este guia e `install-skills.sh` na mesma demanda local; uma skill pessoal ou de plugin não entra automaticamente nesse conjunto.

Antes de incorporar uma skill, registre na demanda local a necessidade, origem, referência de versão ou revisão quando disponível, escopo de instalação, dependências e permissões. Revise o `SKILL.md` e recursos executáveis; confirme que nome e descrição explicam quando usá-la. Após instalação autorizada, confira os arquivos, sua visibilidade na sessão e as dependências necessárias. Informe o que foi apenas inspecionado e o que foi efetivamente testado; instalar não comprova funcionamento.

Pesquisar skills externas, inclusive com `find-skills`, é uma etapa distinta de consultar as já disponíveis. Uma recomendação não autoriza instalação, atualização ou execução de scripts. Esta rotina não executa bootstrap automaticamente e não exige nova instalação quando as skills existentes atendem à tarefa.

## Bootstrap

Pré-requisito: Node.js e npm disponíveis no ambiente. Na raiz do repositório recém-clonado, execute:

```bash
bash Factory/setup/install-skills.sh
```

O script usa o CLI `npx skills` sem instalação global, instala somente as skills listadas neste documento no agente `codex`, em escopo de projeto, e copia os arquivos para `.agents/skills/`. A instalação é repetível; revise o diff e o conteúdo das skills antes de adicioná-las ao controle de versão ou usá-las em missões sensíveis.

Para conferir o que foi instalado:

```bash
if [ -d .agents/skills ]; then
  rg --files --hidden --follow .agents/skills -g SKILL.md
else
  echo "Sem skills locais nesta cópia; confira o catálogo da sessão."
fi
```

Para atualizar uma skill ou adicionar uma nova, altere o script e esta lista na mesma demanda local, valide a origem e revise o conteúdo obtido. As referências abaixo são as fontes declaradas para cada skill.

## Conjunto de bootstrap e comandos individuais

| Skill | Origem | Comando |
| --- | --- | --- |
| `find-skills` | [`vercel-labs/skills`](https://www.skills.sh/vercel-labs/skills/find-skills) | `npx skills add https://github.com/vercel-labs/skills --skill find-skills --agent codex --copy --yes` |
| `agent-browser` | [`vercel-labs/agent-browser`](https://www.skills.sh/vercel-labs/agent-browser/agent-browser) | `npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser --agent codex --copy --yes` |
| `using-superpowers` | [`obra/superpowers`](https://www.skills.sh/obra/superpowers/using-superpowers) | `npx skills add https://github.com/obra/superpowers --skill using-superpowers --agent codex --copy --yes` |
| `grill-me` | [`mattpocock/skills`](https://www.skills.sh/mattpocock/skills/grill-me) | `npx skills add https://github.com/mattpocock/skills --skill grill-me --agent codex --copy --yes` |
| `to-tickets` | [`mattpocock/skills`](https://www.skills.sh/mattpocock/skills/to-tickets) | `npx skills add https://github.com/mattpocock/skills --skill to-tickets --agent codex --copy --yes` |
| `to-spec` | [`mattpocock/skills`](https://www.skills.sh/mattpocock/skills/to-spec) | `npx skills add https://github.com/mattpocock/skills --skill to-spec --agent codex --copy --yes` |
| `to-prd` | [`mattpocock/skills`](https://www.skills.sh/mattpocock/skills/to-prd) | `npx skills add https://github.com/mattpocock/skills --skill to-prd --agent codex --copy --yes` |
| `humanizer` | [`blader/humanizer`](https://www.skills.sh/blader/humanizer/humanizer) | `npx skills add https://github.com/blader/humanizer --skill humanizer --agent codex --copy --yes` |
| `i-have-adhd` | [`ayghri/i-have-adhd`](https://www.skills.sh/ayghri/i-have-adhd/i-have-adhd) | `npx skills add https://github.com/ayghri/i-have-adhd --skill i-have-adhd --agent codex --copy --yes` |

Os comandos usam as opções documentadas do Skills CLI: `--skill` seleciona skill; `--agent codex` define o agente; `--copy` evita links simbólicos; `--yes` permite bootstrap sem prompts interativos. O diretório padrão de skills de projeto do Codex é `.agents/skills/`, não `.codex/.agents/.skills/`.

## Preparação específica do agent-browser

A instalação da skill fornece instruções, mas o uso do navegador também requer o CLI e o navegador. Quando a missão exigir automação de browser, siga o setup da versão instalada:

```bash
npm install --global agent-browser
agent-browser install
agent-browser skills get core
```

Isso instala o CLI globalmente no ambiente de desenvolvimento e baixa o navegador suportado. Não roda automaticamente no bootstrap para não alterar o ambiente global em toda máquina que clonar o repositório. Se o runtime exigir instalação restrita ao projeto, escolha e documente essa alternativa para a stack local.

## Integração com as políticas da factory

- As skills complementam `AGENTS.md` e `Factory/policies/`; não substituem nem sobrepõem os critérios de QA, DoD, registro local, privacidade ou aprovação humana.
- `to-spec`, `to-prd` e `to-tickets` podem orientar criação/publicação de artefatos no issue tracker e pressupõem vocabulário de labels. Prepare artefatos locais; a publicação é humana. Respeite `Factory/policies/issues-and-pull-requests.md`, os templates do repositório e os labels realmente configurados; não assuma que `ready-for-agent` exista.
- `i-have-adhd` é uma preferência de interação opt-in. Sua presença no repositório não autoriza inferir diagnóstico nem ativar o modo automaticamente; use apenas quando o usuário pedir.
- `humanizer` pode revisar textos para remover padrões artificiais, preservando a voz, o significado e os fatos. Não introduza alegações, dados ou fontes que não estejam no original.
- O Skills CLI envia telemetria anônima por padrão com metadados da instalação. O bootstrap exporta `DISABLE_TELEMETRY=1` para desativá-la; consulte a documentação atual do [CLI](https://www.skills.sh/docs/cli) se essa preferência mudar.
- As skills são conteúdo de terceiros. Faça revisão de origem e de `SKILL.md`, especialmente antes de executar comandos que publiquem issues ou façam chamadas externas.
