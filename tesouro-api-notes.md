# Fonte da integração do Tesouro Direto

A documentação consultada foi https://brapi.dev/docs/tesouro-direto.

A brapi documenta os símbolos públicos no formato slug, por exemplo `tesouro-selic-01032031`, e os endpoints:

- `GET https://brapi.dev/api/v2/treasury/list?indexer=selic`
- `GET https://brapi.dev/api/v2/treasury/indicators?symbols=tesouro-selic-01032031`
- `GET https://brapi.dev/api/v2/treasury/indicators/history?symbols=tesouro-selic-01032031&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Os campos relevantes são `buyPrice`, `sellPrice`, `basePrice`, `buyRate`, `sellRate`, `symbol`, `bondType`, `indexer`, `couponType` e `durationDays`. A documentação informa que o histórico é diário e que o acesso detalhado depende do plano da brapi; os três títulos sandbox documentados são `tesouro-selic-01032031`, `tesouro-prefixado-com-juros-semestrais-01012037` e `tesouro-ipca-com-juros-semestrais-15082060`.

A referência oficial do Tesouro Direto informa que o mercado opera das 09h30 às 18h00 e que, fora do horário, a última atualização disponível pode permanecer no dia útil anterior: https://www.tesourodireto.com.br/en/produtos/dados-sobre-titulos/historico-de-precos-e-taxas.
