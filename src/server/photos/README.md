# Adaptadores de foto privada

`image.ts` verifica extensão/MIME/magic e decodifica o arquivo inteiro antes de reencodá-lo. Usa o Sharp já distribuído pelo Next 16.3.5 instalado, através de `next/dist/server/image-optimizer.js`; nenhum pacote foi adicionado. O adaptador concentra esse acoplamento interno: upgrades do Next precisam executar os testes das três imagens. Metadados EXIF/GPS e conteúdo anexado são descartados. Há proteção de recursos de 64 megapixels e imagens multipágina são recusadas; tamanho de entrada e saída não supera 5 MiB.

`storage.ts` exige credencial server-only `SUPABASE_SERVICE_ROLE_KEY`, sem fallback anon. `PHOTO_TOKEN_SECRET`, quando configurado na `.env` raiz, separa a assinatura do token; na ausência usa a credencial server-only com separação de domínio HMAC. Falta de configuração, bucket inexistente/público ou erro externo retornam falha, nunca sucesso simulado.

Bucket fixo: `core-occurrence-evidence`. A migration `202610010008_private_photos` prepara bucket privado, limite/MIMEs e policies restritivas que excluem este bucket de permissões amplas do legado. Apenas o usuário aplica migrations no ambiente compartilhado. A IA não criou nem modificou o bucket remoto. As policies não alteram permissões de outros buckets; tabelas e fotos legadas permanecem preservadas.

O servidor faz uploads sem sobrescrita e solicita URLs de 60 segundos somente depois da autorização sob a role Core restrita. Não há URLs públicas nem chamadas do navegador à Data API/Storage com privilégios.

Homologação 20: aplicar migration pelo fluxo do usuário; verificar policies reais, negativas anon/Consulta/outro grupo, assinatura e download antes/depois de 60 segundos. Também verificar concorrência/replay da abertura com token e política de limpeza dos objetos de staging sem associação (upload cuja resposta se perde pode deixar um objeto órfão). Expiração do token não remove automaticamente o objeto.
