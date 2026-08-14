# Validação de produção — bypass temporário

Em 14/08/2026, a URL `https://findash-lvo.vercel.app/` foi aberta em navegador sem autenticação prévia. O dashboard carregou diretamente, sem tela de login, mostrando a navegação Visão geral/Lançamentos, os cartões financeiros, o gráfico vazio e o botão Adicionar lançamento.

A interface exibiu o usuário temporário `Usuário de desenvolvimento` e `dev@findash.local`, confirmando a integração cliente–API com `auth.me` sem cookie de sessão. A API também foi validada separadamente com HTTP 200 e o mesmo usuário temporário no deployment do commit `c5c0b71a`.
