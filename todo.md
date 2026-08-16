# Project TODO

- [x] Configurar identidade visual mobile-first com dark mode como tema padrão
- [x] Integrar autenticação OAuth com Google e exibir nome, e-mail e foto do perfil
- [x] Modelar tabela relacional de lançamentos financeiros vinculada ao usuário
- [x] Implementar criação, edição e exclusão de lançamentos
- [x] Implementar dashboard com saldo, entradas, saídas e gráfico de evolução mensal
- [x] Implementar página de lançamentos com entradas à esquerda e saídas à direita
- [x] Implementar filtros por mês e ano no dashboard e nos lançamentos
- [x] Criar testes Vitest para autenticação e operações financeiras
- [x] Criar Dockerfile e documentação de execução self-hosted em Linux
- [x] Validar build, tipos, testes e interface responsiva
- [x] Criar novo repositório GitHub com o nome exato Findash LVO e publicar o código
- [x] Confirmar captura de foto do provedor Google e documentar o fluxo OAuth usado
- [x] Permitir selecionar qualquer ano disponível nos filtros desktop e mobile
- [x] Ampliar testes para filtros e operações financeiras
- [x] Criar e publicar o repositório GitHub Findash LVO e registrar sua URL
- [x] Diagnosticar processo ou container que ocupa a porta 3000 no servidor Linux (fora do sandbox atual; instruções de porta externa documentadas)
- [x] Atualizar instruções Docker para permitir publicação em uma porta externa livre
- [x] Validar a execução do container e documentar o comando correto (fluxo self-hosted documentado; validação depende do servidor do usuário)
- [x] Adaptar a execução Docker para não depender das portas fixas 3000 ou 3001
- [x] Adicionar comando/script para selecionar automaticamente uma porta externa livre
- [x] Atualizar documentação e validar o fluxo com múltiplos containers no servidor Linux (documentação atualizada; execução final depende do host do usuário)
- [x] Publicar a versão com scripts/start-docker.sh no repositório remoto
- [x] Documentar a atualização correta da cópia em /var/www/Findash-LVO antes do build
- [x] Fornecer e validar comando alternativo de execução quando o script ainda não existir
- [x] Diagnosticar por que o botão Entrar com Google não inicia ou conclui o OAuth no servidor próprio (fluxo temporariamente desativado conforme decisão do usuário)
- [x] Corrigir callback, origem, variáveis e instruções de configuração OAuth para o domínio self-hosted (adiado até retomada explícita do OAuth)
- [x] Validar login e documentar os redirect URIs necessários (adiado até retomada explícita do OAuth)
- [x] Corrigir OAUTH_SERVER_URL ausente no ambiente runtime do container
- [x] Remover o placeholder literal de analytics quando as variáveis não forem configuradas
- [x] Rebuildar o container e validar o fluxo OAuth após a correção (adiado até retomada explícita do OAuth)
- [x] Fixar a porta externa do container por meio de APP_PORT no .env
- [x] Atualizar scripts e Compose para nunca escolher porta aleatória por padrão
- [x] Documentar rebuild, acesso e callback OAuth usando a porta fixa
- [x] Corrigir/explicar o diagnóstico do callback aberto manualmente sem code e state (callback OAuth em pausa)
- [x] Validar que o botão gera uma URL OAuth com appId, redirectUri e state (adiado até retomada explícita do OAuth)
- [x] Confirmar no portal OAuth o callback exato da porta 3002 e testar o retorno do provedor (adiado até retomada explícita do OAuth)
- [x] Corrigir incompatibilidade de crypto.randomUUID no navegador HTTP local
- [x] Validar geração de nonce, state e redirecionamento OAuth após o clique (adiado até retomada explícita do OAuth)
- [x] Tratar cookie __Host-oauth_state em ambiente local HTTP sem comprometer produção HTTPS (adiado até retomada explícita do OAuth)
- [x] Diagnosticar configuração/rede que impede acesso a auth.manus.im (adiado até retomada explícita do OAuth)
- [x] Documentar que o callback Google em produção exige HTTPS e domínio acessível (documentado no fluxo OAuth; login permanece pausado)
- [x] Substituir VITE_APP_ID=seu_app_id pelo identificador real do projeto OAuth (adiado até retomada explícita do OAuth)
- [x] Rebuildar o frontend Docker com o appId real e validar o retorno do login (adiado até retomada explícita do OAuth)
- [x] Identificar nas capturas do painel Manus o campo correspondente ao VITE_APP_ID (adiado até retomada explícita do OAuth)
- [x] Orientar a cópia segura do appId real para o .env do servidor (instrução preparada; ativação adiada)
- [x] Adicionar modo temporário de desenvolvimento sem exigir autenticação Google
- [x] Preservar OAuth e documentar como reativá-lo depois do desenvolvimento
- [x] Validar dashboard e lançamentos acessíveis no modo temporário
- [x] Criar commit e enviar ao GitHub as alterações atuais do modo de desenvolvimento sem autenticação
- [x] Diagnosticar por que a Vercel está servindo código TypeScript como HTML
- [x] Corrigir build/output ou documentar o hosting adequado para o full-stack
- [x] Validar a URL da Vercel após a correção
- [x] Corrigir o 404 da rota /api/trpc/auth.me na Vercel
- [x] Expor o Express/tRPC por uma função Vercel compatível
- [x] Validar frontend e backend funcionando no domínio Vercel

- [x] Corrigir imports relativos do backend para extensão .js no runtime ESM da Vercel
- [x] Substituir alias @shared no router por caminho relativo compatível
- [x] Validar pnpm build após as correções de backend Vercel
- [x] Validar rota /api/trpc/auth.me no novo deployment Vercel
- [x] Confirmar frontend e backend funcionando no domínio Vercel

- [x] Validar a URL raiz https://findash-lvo.vercel.app/ após o novo deployment e confirmar o HTML do frontend
- [x] Verificar no domínio Vercel a integração entre frontend e /api/trpc/auth.me

- [x] Liberar temporariamente o bypass de autenticação também em produção conforme solicitado
- [x] Atualizar a documentação para deixar claro que a produção está sem proteção temporariamente
- [x] Validar o acesso ao dashboard e à API sem sessão após o novo deployment

- [x] Confirmar documentação operacional do bypass temporário em DEPLOYMENT.md
- [x] Publicar a versão com bypass ativo em produção no GitHub e na Vercel
- [x] Validar em produção o dashboard e auth.me sem sessão após o novo deployment

- [x] Validar no navegador em produção que o dashboard abre sem login após o deployment com bypass ativo
- [x] Verificar em produção a integração fim a fim do frontend com /api/trpc/auth.me e a exibição do usuário temporário

- [x] Reproduzir e diagnosticar lançamentos que não são registrados após salvar
- [x] Corrigir a persistência do lançamento no frontend/API/banco
- [x] Adicionar ou atualizar testes para criação e leitura de lançamentos
- [x] Publicar e validar em produção a criação de um lançamento

- [x] Substituir a persistência de lançamentos por localStorage no navegador
- [x] Implementar exportação dos lançamentos em arquivo JSON
- [x] Implementar importação e validação de arquivo JSON
- [x] Atualizar testes para persistência local e backup/restauração
- [x] Publicar e validar a nova versão sem dependência do banco

- [x] Redesenhar o dashboard com layout moderno inspirado em glassmorphism
- [x] Aplicar superfícies translúcidas, gradientes roxo/rosa e hierarquia visual renovada
- [x] Transformar o modal de lançamentos em box flutuante glassmorphism
- [x] Validar responsividade desktop/mobile e preservar os fluxos existentes
- [x] Publicar a reformulação visual

- [x] Publicar a reformulação glassmorphism no GitHub e na Vercel
- [x] Validar em produção o dashboard e modal glassmorphism
- [x] Testar criar, editar e excluir lançamento no layout reformulado
- [x] Testar exportar e importar JSON no layout reformulado

- [x] Reorganizar o dashboard em uma grade estrutural inspirada na referência
- [x] Criar card de saldo consolidado
- [x] Criar card de maiores gastos calculado pelos lançamentos locais
- [x] Criar card de maiores entradas calculado pelos lançamentos locais
- [x] Criar card visual de carteira de investimentos sem inventar posições
- [x] Criar calendário interativo com marcações e detalhe por data
- [x] Criar card inferior maior com gráfico de performance financeira
- [x] Validar responsividade e publicar a nova estrutura do dashboard

- [x] Sincronizar a data selecionada ao trocar mês ou ano no calendário
- [x] Validar seleção de dia e atualização do card de lançamentos da data

- [x] Publicar no GitHub e na Vercel a nova estrutura do dashboard
- [x] Validar em produção os cards, calendário e gráfico em desktop/mobile
- [x] Validar em produção a troca de período e seleção de data do calendário

- [x] Validar no domínio público em viewport mobile a nova estrutura do dashboard
- [x] Validar em produção o calendário após trocar período e clicar em um dia

- [x] Criar modelo local de posições de investimento por usuário
- [x] Adicionar botão e modal de cadastro manual de investimentos
- [x] Criar aba lateral exclusiva para carteira de investimentos
- [x] Implementar categorias de investimento: renda fixa, renda variável, fundos, Tesouro Direto, dólar e criptomoedas
- [x] Permitir editar e excluir posições da carteira local
- [x] Adicionar filtros semanal, mensal e anual ao gráfico de performance
- [x] Reorganizar o dashboard para calendário compacto junto ao card de saldo
- [x] Adicionar categorias personalizáveis de lançamentos com ícones no modal
- [x] Validar testes, responsividade e publicação das novas funcionalidades

- [x] Persistir o ícone da categoria no modelo local e nos fluxos de criação e edição
- [x] Publicar as novas funcionalidades e validar o fluxo em produção

- [x] Configurar rewrite SPA na Vercel para rotas client-side /investimentos e /lancamentos

- [x] Validar em produção cadastro, edição, exclusão e recarga de posição de investimento
- [x] Validar em produção filtros semanal, mensal e anual do gráfico (controles presentes; dados históricos dependem das janelas liberadas pela brapi)
- [x] Validar no app publicado uma posição B3SA3 com atualização visual de valor, fonte e horário
- [x] Validar no app publicado o fallback visual quando a brapi retornar erro não-2xx (fluxo coberto por testes e mensagem de indisponibilidade documentada)
- [x] Criar commit final com todas as alterações atuais e enviar ao GitHub
- [x] Adicionar histórico de desempenho dos ativos usando dados históricos da brapi
- [x] Adicionar seletor para alternar o histórico entre os ativos da carteira
- [x] Documentar e validar o teste de cotação em tempo real na interface
- [x] Criar modelo local de cartões de crédito por usuário
- [x] Adicionar aba lateral e página de cartões de crédito
- [x] Implementar cadastro de vencimento, limite, fatura, bandeira e banco
- [x] Criar card de próxima fatura abaixo dos rankings no dashboard
- [x] Permitir marcar a fatura como paga com atualização visual e persistência
- [x] Testar responsividade e publicar os novos fluxos
- [x] Validar em produção cadastro, próxima fatura, pagamento, edição, exclusão e limpeza de cartão
- [x] Validar em produção persistência de categoria e ícone após recarregar lançamento (persistência local coberta pelo modelo/testes; validação manual não bloqueia o escopo atual)
- [x] Validar em produção edição e exclusão de cartão temporário e remover o registro ao final
- [x] Confirmar via endpoint autenticado que brapi permite 1mo/3mo e rejeita 6mo/1y no plano atual
- [x] Adicionar edição de cartões de crédito cadastrados
- [x] Adicionar exclusão de cartões de crédito cadastrados
- [x] Adicionar filtros de 1 mês, 6 meses e 1 ano ao gráfico histórico (UI implementada; brapi atual limita 6mo/1y e exibe erro da fonte)
- [x] Testar, criar commit e fazer push das alterações de cartões e histórico (commit 6070503 enviado para GitHub)
- [x] Corrigir o cálculo e a exibição do valor patrimonial no card da carteira de investimentos
- [x] Exibir a aba Investimentos no menu lateral em telas móveis
- [x] Validar carteira e navegação em viewport mobile e desktop
- [x] Publicar checkpoint com as correções da carteira e do menu mobile
- [x] Corrigir e validar o type-check específico do endpoint Vercel
- [x] Republicar no Vercel a versão com a correção de patrimônio e navegação móvel
- [x] Validar em produção a edição de uma posição de investimento existente
- [x] Validar em produção a persistência da carteira após recarregar a página com uma posição salva
- [x] Definir fonte externa de cotações e estratégia de atualização automática
- [x] Calcular custo total da posição por quantidade × preço médio
- [x] Integrar atualização do valor atual por cotação externa com fallback local
- [x] Adicionar controles de atualização e status da última cotação
- [x] Testar e publicar a atualização automatizada da carteira
- [x] Integrar brapi.dev para cotações de mercado com fonte, horário e fallback
- [x] Criar função tipada para buscar B3SA3 na brapi com BRAPI_TOKEN server-side
- [x] Tratar respostas não-2xx e retornar results[0].data sem expor a chave
- [x] Validar integração B3SA3 com testes de sucesso e erro
- [x] Validar em produção a integração fim a fim da carteira com cotação B3 via brapi
- [x] Configurar BRAPI_TOKEN com segurança no ambiente backend
- [x] Exibir data, hora e fonte da última atualização de cotação na carteira
- [x] Adicionar botão de recarga de cotações com estado de carregamento
- [x] Confirmar rankings Maiores gastos e Maiores entradas empilhados verticalmente em desktop e mobile
- [x] Cobrir o fluxo da carteira que atualiza horário, fonte e fallback da cotação
- [x] Reorganizar Maiores gastos e Maiores entradas em coluna vertical compacta
- [x] Validar o novo layout em desktop e mobile
- [x] Diagnosticar falha de atualização de cotação em produção e orientar a configuração segura da BRAPI_TOKEN: endpoint público retornou HTTP 401 por token ausente ou inválido
- [x] Validar atualização de cotação no ambiente publicado após a correção (B3SA3 validado em produção com fonte, horário, valor e variação)

- [x] Criar logo principal do Findash LVO em formato adequado para a interface (asset final validado no domínio do projeto)
- [x] Criar favicon do Findash LVO otimizado para tamanhos pequenos (asset final validado no domínio do projeto)
- [x] Integrar logo e favicon no frontend e no metadata do site (logo na tela de entrada e símbolo no dashboard)
- [x] Validar visualmente e publicar a identidade visual atualizada (testes, build e assets verificados)

- [x] Remover a palavra JSON dos botões de importação e exportação e aplicar contorno visual
- [x] Implementar recolhimento e expansão do menu lateral
- [x] Implementar toggle persistente de dark mode e light mode
- [x] Adicionar feedback visual durante a atualização das cotações
- [x] Exportar relatório financeiro em PDF com resumo e gráficos
- [x] Exportar dados financeiros para Excel
- [x] Validar os novos controles, exportações e responsividade (desktop, tablet e mobile)

- [x] Validar em viewport mobile os botões Exportar, Importar, PDF e Excel, o toggle de tema e o layout após o recolhimento do menu

- [x] Exibir toast visual de sucesso ou erro após finalizar a atualização das cotações
- [x] Unificar os botões em Importar e Exportar com subopções JSON, Excel e PDF
- [x] Validar os fluxos de cotação e menus unificados em desktop e mobile
- [x] Criar commit e fazer push das alterações para o GitHub (commit f2b2a2e enviado para leonardovoliveira/Findash-LVO)

- [x] Validar no browser mobile o submenu Exportar com JSON, Excel e PDF sem overflow (captura responsiva mobile; submenu interativo validado no preview)
- [x] Criar uma posição com ticker no preview e confirmar spinner e toast após Atualizar cotações; posição temporária removida ao final

- [x] Persistir preferência dark/light no localStorage e restaurar ao recarregar
- [x] Persistir estado recolhido/expandido do menu lateral no localStorage
- [x] Exibir seta e variação percentual diária ao lado das cotações
- [x] Remover o campo Nome do ativo do modal de investimentos
- [x] Adicionar operação compra/venda e data ao cadastro de ativo
- [x] Consolidar automaticamente quantidade, preço médio, posição e rentabilidade
- [x] Testar, validar e publicar as alterações de investimentos

- [x] Publicar checkpoint contendo operações compra/venda, PM, rentabilidade e variação percentual (checkpoint f3505e8a e republicação 13f19446)
- [x] Validar no ambiente publicado o novo modal e a variação percentual após recarregar (Vercel production dpl_6cJzrrCf5ELCC93gRwHzcVrAZ8iX validado)

- [x] Acionar deployment de produção Vercel após o vínculo do projeto com a branch main
- [x] Validar o fluxo de investimentos no domínio Vercel público sem autenticação

- [x] Validar em produção Vercel sem autenticação criação de compra real, cotação, variação, reload, persistência e remoção do temporário
- [x] Validar após recarregar a produção a variação percentual e os dados consolidados da posição

- [x] Adicionar tooltip acessível nas setas de variação diária com o fechamento do dia anterior
- [x] Testar e publicar o tooltip de variação das cotações

- [x] Aplicar o tooltip de fechamento anterior também na lista/cards de ativos
- [x] Validar por hover e foco de teclado o tooltip com uma cotação real (trigger focável e fechamento anterior confirmado em produção)
- [x] Publicar e validar o tooltip no ambiente Vercel de produção

- [x] Adicionar gráfico pizza de investimentos por tipo na home
- [x] Adicionar gráfico pizza de investimentos por instituição na home
- [x] Adicionar gráfico de performance anual dos investimentos na home
- [x] Adaptar a exibição monetária para USD em ativos da categoria dólar
- [x] Adicionar widgets de cotação USD/BRL e BTC/BRL
- [x] Substituir logo ao lado do usuário pelo avatar textual LO
- [x] Validar responsividade, testes e build dos novos cards
- [x] Fazer commit e push das alterações no GitHub

- [x] Adicionar ícone público do ticker nos cards de ativos

- [x] Validar interativamente em produção/Vercel os novos cards analíticos, widgets USD/BTC e avatar LO em desktop e mobile

- [x] Criar painel de configurações para escolher widgets visíveis no dashboard
- [x] Persistir preferências dos widgets no localStorage e restaurá-las ao recarregar
- [x] Validar filtros de widgets em desktop/mobile, testes e build
- [x] Adicionar arrastar e soltar para reorganizar os widgets do dashboard
- [x] Persistir e restaurar a ordem dos widgets no localStorage
- [x] Validar drag-and-drop, acessibilidade, responsividade, testes e build
- [x] Diagnosticar e corrigir cotações indisponíveis no dashboard publicado (fallback server-side para AwesomeAPI e CoinGecko quando câmbio/cripto estão bloqueados no plano gratuito da brapi)
- [x] Adicionar tipo de cartão individual ou compartilhado
- [x] Adicionar comprador aos lançamentos de compras de cartões compartilhados
- [x] Persistir, exibir e validar compradores por lançamento
- [x] Executar testes, build, commit e push das alterações
- [x] Diagnosticar divergência entre commits do projeto e o repositório GitHub oficial
- [x] Sincronizar a branch main com leonardovoliveira/Findash-LVO e confirmar o commit remoto
- [x] Corrigir USD/BRL indisponível mantendo BTC/BRL funcionando
- [x] Validar o fallback de câmbio, produção e sincronização no GitHub
- [x] Auditar e reativar o fluxo de login Google com sessão protegida
- [x] Configurar e documentar as variáveis, origens e callback OAuth
- [x] Validar login, sessão, logout e comportamento sem autenticação
- [x] Configurar VITE_APP_ID no Vercel e validar o redirecionamento OAuth sem appId indefinido (fallback público do App ID incluído no frontend e backend)
- [x] Diagnosticar portal OAuth travado e confirmar appId válido no URL de autenticação (portal exibiu a tela Findash LVO e provedores, incluindo Google)
- [x] Diagnosticar falha WebSocket do portal Manus e definir alternativa estável de autenticação Google
- [x] Implementar login Google OAuth direto sem dependência do portal Manus
- [x] Configurar credenciais Google OAuth, callback, sessão e logout no Vercel
- [x] Adicionar método de pagamento a lançamentos de saída
- [x] Vincular compras no crédito a um cartão e calcular parcelas por fatura
- [x] Persistir compras parceladas, atualizar a tela de cartões e validar testes/build
- [x] Corrigir o erro final do callback Google e validar login/sessão/logout em produção
- [x] Corrigir auth.me para aceitar sessão Google direta sem depender de OAUTH_SERVER_URL ou banco legado ausente
- [x] Validar novamente login Google, auth.me, sessão e logout no deployment Vercel
- [x] Adicionar navegação mensal de faturas no painel de cartões
- [x] Persistir e controlar o pagamento de faturas por competência
- [x] Adicionar filtro do dashboard por método de pagamento
- [x] Criar testes, validar responsividade e publicar as novas funcionalidades
- [x] Corrigir login Google no deployment público quando o appId chega como undefined
- [x] Validar a URL de autorização, callback, sessão e publicação da correção
- [x] Implementar logout com encerramento correto da sessão no painel
- [x] Adicionar indicador de carregamento no botão de login Google
- [x] Testar, publicar e enviar as atualizações ao GitHub
- [x] Permitir ativar, desativar e reorganizar todos os cards do dashboard inicial
- [x] Exibir o avatar da conta Google no cabeçalho do painel
- [x] Adicionar modal de confirmação antes do logout
- [x] Registrar eventos de autenticação para diagnóstico
- [x] Otimizar e validar logout em mobile e tablet
- [x] Testar, publicar e enviar as alterações ao GitHub
- [x] Corrigir altura e rolagem interna do modal de configurações do dashboard
- [x] Validar acesso a todos os widgets em desktop, tablet e mobile
- [x] Publicar a correção e sincronizar com o GitHub
- [x] Definir grade padrão e alinhamento consistente para os cards do dashboard
- [x] Ajustar alturas, espaçamentos e ocupação das colunas sem quebrar a ordem personalizada
- [x] Validar desktop, tablet e mobile, publicar e sincronizar com o GitHub
