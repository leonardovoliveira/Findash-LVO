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
- [ ] Diagnosticar processo ou container que ocupa a porta 3000 no servidor Linux
- [x] Atualizar instruções Docker para permitir publicação em uma porta externa livre
- [ ] Validar a execução do container e documentar o comando correto
- [x] Adaptar a execução Docker para não depender das portas fixas 3000 ou 3001
- [x] Adicionar comando/script para selecionar automaticamente uma porta externa livre
- [ ] Atualizar documentação e validar o fluxo com múltiplos containers no servidor Linux
- [x] Publicar a versão com scripts/start-docker.sh no repositório remoto
- [x] Documentar a atualização correta da cópia em /var/www/Findash-LVO antes do build
- [x] Fornecer e validar comando alternativo de execução quando o script ainda não existir
- [ ] Diagnosticar por que o botão Entrar com Google não inicia ou conclui o OAuth no servidor próprio
- [ ] Corrigir callback, origem, variáveis e instruções de configuração OAuth para o domínio self-hosted
- [ ] Validar login e documentar os redirect URIs necessários
- [x] Corrigir OAUTH_SERVER_URL ausente no ambiente runtime do container
- [x] Remover o placeholder literal de analytics quando as variáveis não forem configuradas
- [ ] Rebuildar o container e validar o fluxo OAuth após a correção
- [x] Fixar a porta externa do container por meio de APP_PORT no .env
- [x] Atualizar scripts e Compose para nunca escolher porta aleatória por padrão
- [x] Documentar rebuild, acesso e callback OAuth usando a porta fixa
- [ ] Corrigir/explicar o diagnóstico do callback aberto manualmente sem code e state
- [ ] Validar que o botão gera uma URL OAuth com appId, redirectUri e state
- [ ] Confirmar no portal OAuth o callback exato da porta 3002 e testar o retorno do provedor
- [x] Corrigir incompatibilidade de crypto.randomUUID no navegador HTTP local
- [ ] Validar geração de nonce, state e redirecionamento OAuth após o clique
- [ ] Tratar cookie __Host-oauth_state em ambiente local HTTP sem comprometer produção HTTPS
- [ ] Diagnosticar configuração/rede que impede acesso a auth.manus.im
- [ ] Documentar que o callback Google em produção exige HTTPS e domínio acessível
- [ ] Substituir VITE_APP_ID=seu_app_id pelo identificador real do projeto OAuth
- [ ] Rebuildar o frontend Docker com o appId real e validar o retorno do login
- [ ] Identificar nas capturas do painel Manus o campo correspondente ao VITE_APP_ID
- [ ] Orientar a cópia segura do appId real para o .env do servidor
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

- [ ] Validar em produção cadastro, edição, exclusão e recarga de posição de investimento
- [ ] Validar em produção filtros semanal, mensal e anual do gráfico
- [ ] Validar em produção persistência de categoria e ícone após recarregar lançamento
- [x] Corrigir o cálculo e a exibição do valor patrimonial no card da carteira de investimentos
- [x] Exibir a aba Investimentos no menu lateral em telas móveis
- [x] Validar carteira e navegação em viewport mobile e desktop
- [x] Publicar checkpoint com as correções da carteira e do menu mobile
- [ ] Corrigir e validar o type-check específico do endpoint Vercel
- [ ] Republicar no Vercel a versão com a correção de patrimônio e navegação móvel
