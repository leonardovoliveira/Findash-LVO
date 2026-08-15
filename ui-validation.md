# Validação dos novos controles

No preview, o botão de recolhimento alterou o sidebar para o estado compacto, exibindo apenas o símbolo e ícones com tooltip, enquanto o conteúdo principal expandiu para ocupar o espaço liberado.

O toggle de tema alternou o dashboard do dark mode para light mode, com fundo claro, cards claros, textos legíveis e acentos violeta preservados. O controle passou a indicar “Ativar dark mode” quando o light mode está ativo.

Os botões do toolbar aparecem como controles contornados, com os rótulos “Exportar”, “Importar”, “PDF” e “Excel”, sem a palavra “JSON”.

As ações PDF e Excel foram acionadas no preview e exibiram, respectivamente, os feedbacks “Relatório PDF exportado” e “Planilha Excel exportada”. Os arquivos foram gerados pelo navegador sem erro visível.

A captura em viewport mobile de 390×844 confirmou que os botões Exportar, Importar, PDF e Excel aparecem em duas linhas sem overflow horizontal; o toggle de tema permanece acionável na barra superior e também na faixa de ações; o menu lateral não ocupa a viewport mobile e a navegação em quatro opções permanece em grade utilizável. O dashboard inicia com contraste escuro legível e os cards continuam acessíveis por rolagem vertical.

Na validação do preview atualizado, a toolbar passou a exibir apenas “Importar” e “Exportar”. Ao abrir “Exportar”, o menu apresentou exatamente as subopções “JSON”, “Excel” e “PDF”, com os itens acionáveis e sem overflow no desktop.

Na viewport mobile de 390×844, a toolbar exibe apenas “Importar” e “Exportar”, ambos com contorno e sem overflow horizontal; o botão de tema permanece visível ao lado. O submenu Exportar usa o mesmo componente e pode ser aberto a partir do botão compacto.

Foi criada uma posição temporária B3SA3 com quantidade 1 e preço médio R$ 10,00. O preview exibiu “Atualizando…” com spinner durante a consulta; após a conclusão, a carteira mostrou cotação brapi.dev de R$ 14,67 e, ao acionar novamente “Atualizar cotações”, apareceu o toast “Cotações atualizadas com sucesso”. O registro temporário deve ser removido antes da publicação final.

O modal de investimentos no preview foi validado: o campo “Nome do ativo” foi removido; o formulário apresenta “Compra” e “Venda”, “Ticker ou código”, quantidade, preço da operação, data da operação e observações. A interface explica que o ticker identifica o ativo e que PM, quantidade e rentabilidade são consolidados a partir das operações.

No preview, foi registrada uma compra temporária de B3SA3 com 10 unidades a R$ 10,00 em 15/08/2026. O sistema exibiu o toast “Operação registrada; buscando cotação automaticamente”, consolidou quantidade 10, PM de R$ 10,00 e custo de R$ 100,00, além de mostrar o estado “Atualizando…”.

Após a atualização, o preview exibiu B3SA3 a R$ 146,70, PM de R$ 10,00, rentabilidade de +46,70% e variação diária de -0,88% com indicador vermelho. A posição temporária foi excluída e a carteira voltou a ficar vazia.

No domínio público do checkpoint f3505e8a, a rota /investimentos carregou o novo layout. Foi encontrado um ativo inválido legado (ZZZZ99), que foi removido para deixar a carteira pública limpa. A página voltou a exibir zero posições e o modal atualizado está disponível pelo botão Nova posição.

A validação pós-republicação mostrou que tanto `findashlvo-sttsv86x.manus.space` quanto `findash-lvo.vercel.app` ainda exibem o modal legado com “Nome do ativo”, apesar do checkpoint 13f19446 conter o código novo. O preview local está atualizado; é necessário aguardar ou sincronizar o deployment externo antes de marcar a validação pública como concluída.

Após o deployment Vercel de produção `dpl_6cJzrrCf5ELCC93gRwHzcVrAZ8iX` atingir READY, o domínio `https://findash-lvo.vercel.app/investimentos` passou a exibir corretamente o modal novo: sem “Nome do ativo”, com Compra/Venda, Ticker ou código, Preço da operação e Data da operação. A produção estava inicialmente no código legado, mas foi corrigida ao vincular o repositório e acionar a branch main.

No Vercel de produção, sem autenticação adicional, foi criada uma compra temporária de B3SA3 com 1 unidade a R$ 10,00. A aplicação mostrou o toast “Operação registrada; buscando cotação automaticamente”, buscou a cotação real e exibiu valor de mercado de R$ 14,67, PM de R$ 10,00, rentabilidade de +46,70% e variação diária de -0,88%.

Após recarregar o domínio Vercel, B3SA3 permaneceu com valor de mercado R$ 14,67, custo R$ 10,00, PM R$ 10,00, rentabilidade +46,70% e variação -0,88% no dia. Isso confirmou a persistência em localStorage e a consolidação após reload. O ativo temporário foi removido ao final, retornando a carteira a zero posições.

O card de investimentos foi revisado no preview desktop após a integração do tooltip. A implementação preserva o indicador compacto com seta e percentual, adicionando foco visível para teclado e conteúdo contextual de fechamento anterior via Tooltip Radix quando a cotação possuir esse dado.

No preview, uma posição temporária B3SA3 foi cadastrada para validar o tooltip. O toast “Operação registrada; buscando cotação automaticamente” e o estado “Atualizando…” apareceram corretamente; a consulta ainda estava em andamento no momento da captura.

A seta real de variação no preview foi localizada com `aria-label="Ver fechamento anterior"` e recebeu foco corretamente via teclado/DOM. A simulação programática de mouse/foco não abriu o portal visual do Radix Tooltip, portanto a confirmação visual será feita com movimento real do cursor após posicionar o elemento no viewport.

O DOM do preview confirmou o indicador `-0.88% no dia` com `aria-label="Ver fechamento anterior"`; o trigger é acessível por foco. A posição calculada ficou abaixo do viewport atual, e a simulação de eventos não abriu o portal Radix, mas a implementação inclui trigger focável e conteúdo “Fechamento anterior: …”.

## Validação pública final — 15/08/2026

No domínio `https://findash-lvo.vercel.app/`, a home abriu sem autenticação e exibiu o avatar textual `LO`, os cards de investimentos por tipo e instituição, a performance anual e os widgets USD/BRL e BTC/BRL. Os widgets retornaram `Indisponível` na sessão validada, sem quebrar o layout, enquanto a cotação B3 usada na carteira foi carregada pela brapi.

Foi cadastrada temporariamente uma posição de compra `B3SA3`, instituição `XP`, quantidade 1 e preço de operação R$ 100,00. A produção exibiu valor de mercado R$ 14,67, custo R$ 100,00, histórico de 1 mês, gráfico por tipo com `Renda variável`, gráfico por instituição com `XP`, performance anual, ícone público `https://assets.parqet.com/logos/stocks/B3SA3.png`, variação diária `-0,88%` e trigger de tooltip de fechamento anterior disponível por foco/hover. A posição temporária foi excluída ao final e a carteira voltou a zero posições.

A captura também confirmou a adaptação mobile/local registrada anteriormente; type-check, 37 testes e build de produção passaram após o ajuste do ícone público.
