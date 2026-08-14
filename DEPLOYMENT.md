# Findash LVO — implantação e autenticação temporária

## Estado atual

A versão atual do Findash LVO está configurada para permitir acesso temporário sem login, inclusive em produção. O sistema cria um usuário técnico de desenvolvimento para carregar o dashboard e os lançamentos enquanto o OAuth real não está configurado.

Essa configuração é destinada somente à fase de desenvolvimento e não deve ser usada para dados financeiros reais ou em um ambiente público sem proteção adicional, pois qualquer pessoa que consiga acessar a aplicação poderá utilizar o sistema sem autenticação.

## Reativar a autenticação

Para restaurar a exigência de autenticação, configure a variável de ambiente abaixo no deployment e faça um novo build/redeploy:

```env
DEV_AUTH_BYPASS=false
```

Com `DEV_AUTH_BYPASS=false`, o contexto deixa de criar o usuário temporário e volta a validar a sessão OAuth. Depois disso, o `VITE_APP_ID`, as URLs de OAuth e os callbacks autorizados precisam estar corretamente configurados para permitir o login.

## Vercel

No projeto Vercel, acesse as variáveis de ambiente e defina `DEV_AUTH_BYPASS=false` nos ambientes desejados. Em seguida, crie um novo deployment. A alteração somente terá efeito após o novo processo de build/runtime.

## Docker self-hosted

No servidor Linux, inclua a variável no arquivo `.env` usado pelo container:

```env
DEV_AUTH_BYPASS=false
```

Depois, recrie o container com o procedimento documentado no projeto. Não compartilhe o arquivo `.env`, pois ele pode conter credenciais de banco e OAuth.
