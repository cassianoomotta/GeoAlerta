# Contexto do GeoAlerta

## Propósito e escopo

O GeoAlerta Core reúne registro público de ocorrências e painel municipal de triagem e acompanhamento. O cidadão informa localização GPS nativa obrigatória; toda nova ocorrência é verificada em relação às áreas de risco. Sobreposição com mancha de inundação ativa implica prioridade alta. Alertas aos gestores são visuais, in-app e em tempo real.

O painel `/painel` reúne mapa e alertas. Perfis autorizados exportam dados localmente em CSV. Não há integração bidirecional com planilhas no MVP. As regras e limites de `AGENTS.md` prevalecem.

## Fontes vigentes

- `README.md` e `docs/README.md`: visão e mapa documental.
- `docs/releases/core/README.md`, `PRD.md` e `requirements.md`: escopo e especificação.
- `docs/releases/core/guia-operacional.md`: fluxos documentados e limitações.
- `docs/releases/core/architecture/README.md` e `database/README.md`: arquitetura e dados.
- `docs/releases/core/testing/README.md` e `testing/results/README.md`: verificações e evidências; confira datas e ambiente.

Os caminhos de subpastas acima são relativos a `docs/releases/core/`. Consulte os documentos originais para detalhes. Especificação não comprova implementação ou estado de produção. O repositório conserva módulos legados desabilitados: não os reative por estarem presentes. Confira status das tarefas nas fontes atuais, sem tratar esta memória como backlog completo.

A fábrica atende este projeto. Contexto, decisões e entregas importados estão em `Factory/archive/` e não valem como evidência do GeoAlerta.
