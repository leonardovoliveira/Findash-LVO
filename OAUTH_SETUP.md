# Autenticação Google direta

O Findash LVO usa Google OAuth 2.0 direto no servidor. O navegador inicia o fluxo em `/api/auth/google`; somente o backend recebe o `Client Secret`, troca o código por tokens, valida o ID token do Google e cria a sessão com cookie HTTP-only.

## Variáveis de ambiente

| Variável | Ambiente | Função |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Servidor | Identifica o cliente OAuth Web ao Google. |
| `GOOGLE_CLIENT_SECRET` | Servidor | Troca o código OAuth por um ID token; nunca deve ir ao frontend. |
| `JWT_SECRET` | Servidor | Assina o cookie de sessão do Findash. |
| `DATABASE_URL` | Servidor | Persiste o perfil do usuário Google. |
| `DEV_AUTH_BYPASS=false` | Produção | Impede o usuário temporário de desenvolvimento. |

No Vercel, adicione `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em **Project Settings → Environment Variables** para **Production** e **Preview**. Depois de criar ou alterar uma variável, execute um novo redeploy.

## Callback autorizado no Google Cloud

Cadastre exatamente este URI no cliente OAuth Web:

```text
https://findash-lvo.vercel.app/api/auth/google/callback
```

O protocolo, domínio e caminho precisam coincidir exatamente com o valor cadastrado no Google Cloud. Não inclua uma barra no final.

## Fluxo de validação

1. Abra `https://findash-lvo.vercel.app/` sem uma sessão existente.
2. Clique em **Entrar com Google**.
3. Escolha uma conta autorizada na tela de consentimento Google.
4. Verifique o retorno ao dashboard com nome e e-mail do perfil.
5. Clique em **Sair** e confirme que a tela de entrada reaparece.

## Segurança

O fluxo usa `state` aleatório armazenado em cookie HTTP-only para reduzir risco de CSRF. O callback valida assinatura, emissor, audiência e e-mail verificado no ID token emitido pelo Google. Tokens Google não são armazenados no navegador nem no banco de dados.
