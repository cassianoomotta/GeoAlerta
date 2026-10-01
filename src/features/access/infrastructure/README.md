# Preferências por conta

`preferences.ts` lê e salva somente colunas autorizadas para o ator verificado pelo servidor. Recebe a transação de `withSession`; IDs do navegador não são aceitos. RLS restringe leitura/escrita à própria conta ativa. Mudança para Consulta remove colunas privadas da preferência efetiva.
