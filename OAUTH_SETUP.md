# Configuração do login Google

O Findash LVO usa o fluxo OAuth do Manus, com a identidade do usuário obtida pelo provedor configurado no portal OAuth. A aplicação não armazena client secret no frontend nem no repositório.

## Variáveis necessárias

As variáveis abaixo devem existir no ambiente de produção:

| Variável | Uso |
|---|---|
| `VITE_APP_ID` | Identificador público do aplicativo OAuth usado pelo frontend. |
| `VITE_OAUTH_PORTAL_URL` | URL do portal que inicia o login OAuth. |
| `OAUTH_SERVER_URL` | Endpoint server-side usado para trocar o código pela sessão. |
| `JWT_SECRET` | Assinatura/segurança da sessão do aplicativo. |
| `DATABASE_URL` | Persistência do perfil criado no callback OAuth. |

## Redirect URI

O frontend monta o callback a partir de `window.location.origin`, sem domínio hardcoded:

```text
https://SEU_DOMINIO/api/oauth/callback
```

Para o domínio público atual, o callback correspondente é:

```text
https://findash-lvo.vercel.app/api/oauth/callback
```

Se o domínio Manus for usado, cadastre também:

```text
https://findashlvo-sttsv86x.manus.space/api/oauth/callback
```

Durante desenvolvimento local, use:

```text
http://localhost:3000/api/oauth/callback
```

## Segurança e comportamento

O callback valida o `state` e o nonce armazenado em cookie antes de trocar o código OAuth. Em produção, o usuário temporário de desenvolvimento fica desativado automaticamente; a sessão precisa vir do cookie OAuth. Em desenvolvimento local, o bypass permanece disponível para não bloquear o trabalho quando o provedor ainda não estiver configurado.

Após cadastrar os callbacks, publique uma nova versão e teste: abrir a tela inicial sem sessão, clicar em **Entrar com Google**, concluir o consentimento, retornar ao callback, verificar o nome/e-mail no perfil e executar **Sair**.
