# Validação dos novos controles

No preview, o botão de recolhimento alterou o sidebar para o estado compacto, exibindo apenas o símbolo e ícones com tooltip, enquanto o conteúdo principal expandiu para ocupar o espaço liberado.

O toggle de tema alternou o dashboard do dark mode para light mode, com fundo claro, cards claros, textos legíveis e acentos violeta preservados. O controle passou a indicar “Ativar dark mode” quando o light mode está ativo.

Os botões do toolbar aparecem como controles contornados, com os rótulos “Exportar”, “Importar”, “PDF” e “Excel”, sem a palavra “JSON”.

As ações PDF e Excel foram acionadas no preview e exibiram, respectivamente, os feedbacks “Relatório PDF exportado” e “Planilha Excel exportada”. Os arquivos foram gerados pelo navegador sem erro visível.

A captura em viewport mobile de 390×844 confirmou que os botões Exportar, Importar, PDF e Excel aparecem em duas linhas sem overflow horizontal; o toggle de tema permanece acionável na barra superior e também na faixa de ações; o menu lateral não ocupa a viewport mobile e a navegação em quatro opções permanece em grade utilizável. O dashboard inicia com contraste escuro legível e os cards continuam acessíveis por rolagem vertical.

Na validação do preview atualizado, a toolbar passou a exibir apenas “Importar” e “Exportar”. Ao abrir “Exportar”, o menu apresentou exatamente as subopções “JSON”, “Excel” e “PDF”, com os itens acionáveis e sem overflow no desktop.

Na viewport mobile de 390×844, a toolbar exibe apenas “Importar” e “Exportar”, ambos com contorno e sem overflow horizontal; o botão de tema permanece visível ao lado. O submenu Exportar usa o mesmo componente e pode ser aberto a partir do botão compacto.

Foi criada uma posição temporária B3SA3 com quantidade 1 e preço médio R$ 10,00. O preview exibiu “Atualizando…” com spinner durante a consulta; após a conclusão, a carteira mostrou cotação brapi.dev de R$ 14,67 e, ao acionar novamente “Atualizar cotações”, apareceu o toast “Cotações atualizadas com sucesso”. O registro temporário deve ser removido antes da publicação final.
