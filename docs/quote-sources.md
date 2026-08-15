# Fontes avaliadas para cotações

## brapi.dev

Fonte: https://brapi.dev/docs

A documentação informa que a brapi.dev fornece uma API REST para dados financeiros brasileiros, com ações, FIIs, BDRs, ETFs, fundos, Tesouro Direto, macroeconomia, moedas e criptomoedas. A navegação da documentação inclui endpoints de cotação de ações, fundos, FIIs, Tesouro Direto, moedas e criptomoedas. A página de introdução mostra exemplos públicos de consulta de ações sem token e exemplos de múltiplos símbolos. A integração deve tratar limites, disponibilidade por ativo e possíveis atrasos de mercado; a aplicação não deve apresentar a cotação como garantia de tempo real.

## Decisão preliminar

Usar uma camada server-side de cotação com brapi.dev como primeira fonte para ativos brasileiros e moedas, mantendo o valor manual/cached como fallback. Para ativos internacionais e cripto, será necessário validar a cobertura do ticker na própria API ou adicionar uma segunda fonte, sem misturar cotações incompatíveis silenciosamente. O frontend deve exibir `updatedAt`, fonte e estado da última atualização.
