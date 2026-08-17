# Auditoria do layout de mercados e carteira

O card Mercados de referência agora exibe USD/BRL, EUR/BRL, BTC/BRL e ETH/BRL em uma grade 2x2, posicionado imediatamente abaixo da Próxima fatura na coluna central.

O card Carteira em moedas foi removido da composição da home. A última coluna ficou dedicada à Carteira de investimentos, com altura ampliada para acompanhar a composição principal e uma lista rolável limitada aos 10 maiores ativos por valor de mercado quando houver posições.

Desktop e mobile foram verificados sem overflow horizontal. Os pares EUR/BRL e ETH/BRL aparecem com seus estados de cotação correspondentes; o fallback visual de indisponibilidade continua funcionando quando a fonte não retorna dados.
