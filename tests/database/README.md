# Testes de banco

Executar `npm run test:db`. A suíte verifica configuração, operação espacial PostGIS real e presença do legado. Os testes de migrations geram namespaces únicos nos bancos autorizados, reproduzem baseline e expansão via Prisma Migrate e comparam registros, IDs, arquivos/referências e estados. Estados desconhecidos ou GPS ausente devem falhar antes de DDL, preservando a amostra inválida. Os SQL canônicos não são reescritos; cópias temporárias adaptam somente namespaces/publicação para isolamento.
