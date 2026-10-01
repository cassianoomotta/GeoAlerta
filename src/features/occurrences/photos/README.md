# Foto privada — RF-004 / RF-010

`contracts.ts` fixa formatos, 5 MiB e assinatura de leitura de 60 segundos. `token.ts` assina uma referência opaca HMAC com SHA-256 da chave da tentativa, objeto aleatório e expiração de 15 minutos. O cliente recebe somente o token; a referência fica em `occurrence_private_data`, nunca no feed, projeção pública ou URL permanente.

`service.ts` usa ports de Storage e repositório, validando capacidade privada, estado, município e grupo antes de assinar. `http.ts` limita o stream multipart mesmo quando Content-Length é falso. `public-attempt.ts` mantém chave, corpo e token nas repetições; falha de foto não abre ocorrência e exige escolha explícita para omiti-la.

O token permite uma única ocorrência porque é vinculado à chave única de idempotência. Validação e associação ocorrem dentro da transação de abertura, após verificar replay: uma resposta perdida continua repetível depois da expiração do token. Token de outra chave, adulterado ou expirado nunca seleciona objeto arbitrário.

Teste básico: `npm run test:unit -- tests/unit/photos.spec.ts`. Doubles não comprovam RLS ou serviço Supabase real; essa homologação permanece na história 20.
