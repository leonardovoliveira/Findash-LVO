# Fonte da integração de histórico da carteira

A documentação oficial da brapi para histórico de ações está em https://brapi.dev/docs/acoes/historico.

O endpoint documentado é `GET /api/v2/stocks/historical`, com `symbols`, `range` e `interval` ou datas inicial/final. Na chave atual, os ranges disponíveis são `1d`, `5d`, `1mo` e `3mo`; o cliente do projeto usa `range=3mo&interval=1d` e extrai `results[0].data.historicalDataPrice` para o gráfico.

A documentação também diferencia o endpoint histórico (`/api/v2/stocks/historical`) do snapshot de cotação atual (`/api/v2/stocks/quote`).
