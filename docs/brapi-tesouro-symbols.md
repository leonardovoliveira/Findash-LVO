# Referência externa: símbolos do Tesouro Direto

Fonte consultada em 17/08/2026:

- https://brapi.dev/docs/tesouro-direto
- https://brapi.dev/docs/tesouro-direto/indicadores

A documentação informa que os símbolos públicos são slugs normalizados compostos pelo nome do título e a data de vencimento no formato `DDMMAAAA`. Exemplos oficiais: `tesouro-selic-01032031` e `tesouro-ipca-15052035`. Os endpoints de indicadores e histórico aceitam esses símbolos; símbolos desconhecidos são omitidos da resposta. As taxas de IPCA+ são reais acima do IPCA e os preços unitários são em BRL.

A implementação utiliza candidatos para labels amigáveis como `RENDA+ 2065`, tentando variações `tesouro-renda-mais-15122065`, `tesouro-rend-a-15122065`, `tesouro-renda-mais-2065` e o label original. Para IPCA+ com apenas ano, tenta `tesouro-ipca-150520AAAA`, `tesouro-ipca-AAAA` e o valor original. Esses candidatos são fallback heurístico e devem ser confirmados contra a lista atual de títulos da fonte quando o token do projeto permitir.
