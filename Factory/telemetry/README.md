# Telemetria: fase de ativação

**Estado: não habilitada.** O arquivo `events.schema.json` define um contrato mínimo candidato para futura instrumentação; atualmente não existe coletor, exportador ou destino configurado pela factory.

## Quando passa a fazer sentido

Considere ativar telemetria depois de existir uma linha de base de ciclos suficiente para identificar uma pergunta operacional concreta que o ledger, registros locais, testes e rubrica não respondam. Exemplos: tempo de espera em handoffs, falhas de chamadas de ferramenta ou latência por etapa. Ative apenas se houver fonte/endpoint autorizado, finalidade definida, acesso restrito, retenção, segurança e minimização de dados acordados.

Telemetria é diagnóstico, não placar de qualidade nem gate de conclusão. Use-a para localizar atrito no fluxo e correlacione somente referências opacas de missão; não envie prompts, respostas, conteúdo de arquivos, diffs, segredos, identificadores pessoais ou traces integrais. Nunca habilite exportação de prompts brutos. Dados de token/custo são opcionais e entram apenas se houver fonte confiável e uso autorizado.

Antes de ativar: revisar o contrato e política de privacidade, definir dono do endpoint e retenção, documentar acesso e remoção, testar ausência de conteúdo sensível nos eventos e obter autorização humana específica antes de aplicar. Para Codex, a configuração OpenTelemetry é feita no arquivo de configuração do usuário (`~/.codex/config.toml`); chaves `otel` em `.codex/config.toml` de projeto são ignoradas. `otel.log_user_prompt` exporta prompts sem transformação e deve permanecer desabilitado. Não versionar credenciais ou endpoints privados no repositório.

## Usos no ciclo

1. **Agora:** registrar resultados objetivos no ledger e observações qualitativas pela rubrica; rodar evals locais após mudanças na factory.
2. **Com baseline:** analisar padrões e formular uma hipótese de melhoria.
3. **Quando faltarem dados de fluxo:** instrumentar eventos mínimos e sanitizados para responder a pergunta definida.
4. **Após a instrumentação:** usar trace IDs opacos como referência no ledger, analisar amostras restritas e manter os testes, rubrica e gates de conclusão independentes.
