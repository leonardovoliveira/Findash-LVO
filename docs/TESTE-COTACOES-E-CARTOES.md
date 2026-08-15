# Teste de cotações e cartões no Findash LVO

## Cotação atual

1. Abra a aba **Investimentos**.
2. Clique em **Nova posição**.
3. Informe, por exemplo, `B3SA3` no campo ticker, uma quantidade e um preço médio.
4. Salve a posição. O custo total é calculado como `quantidade × preço médio`.
5. Clique em **Atualizar cotações**. O backend consulta a brapi com `BRAPI_TOKEN`; o valor de mercado passa a ser `quantidade × cotação atual`.
6. Confirme no card da posição o preço atualizado, a fonte `brapi.dev` e a data/hora da última atualização.

A cotação é consultada no backend, não no navegador. Se a API retornar erro ou não houver dados, o sistema mantém o último valor válido e mostra o estado de fallback.

## Histórico de desempenho

Na mesma aba, o bloco **Desempenho histórico** consulta o ticker da primeira posição com ticker cadastrado e apresenta fechamentos diários dos últimos três meses. Para consultar outro ativo, edite o ticker da posição ou mantenha apenas o ativo desejado durante o teste.

## Cartões de crédito

1. Abra **Cartões** no menu lateral.
2. Clique em **Novo cartão** e informe nome, banco, bandeira, vencimento, limite, mês e valor da fatura.
3. Salve o cartão. Ele é persistido no `localStorage` por usuário.
4. No dashboard, o card **Próxima fatura** mostra a fatura aberta mais próxima.
5. Use **Marcar paga** para zerar o valor exibido no card e persistir o estado; o mesmo controle pode ser revertido na página de cartões.
