# Criar o cliente Google OAuth 2.0 para o Findash LVO

Este guia cria um cliente OAuth do tipo **Aplicativo da Web** para autenticar usuários diretamente com a conta Google. O **Client Secret** é confidencial: não o adicione ao GitHub, não o coloque no frontend e não o envie por e-mail.

## 1. Abrir ou criar um projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Entre com a conta Google que administrará a integração.
3. No seletor de projeto no topo, escolha um projeto existente ou clique em **Novo projeto**.
4. Defina um nome, por exemplo, `Findash LVO`, e clique em **Criar**.

> O Google exige que o cliente OAuth pertença a um projeto do Google Cloud. Para este login básico, não é necessário ativar APIs como Google Drive ou Google Calendar.

## 2. Configurar a tela de consentimento

1. No menu lateral, abra **Google Auth Platform**. Se a interface antiga aparecer, use **APIs e serviços → Tela de consentimento OAuth**.
2. Escolha **Externo** se o login puder ser usado por contas Google comuns, depois clique em **Criar**.
3. Preencha ao menos os campos obrigatórios:

| Campo | Valor sugerido |
|---|---|
| Nome do aplicativo | `Findash LVO` |
| E-mail de suporte ao usuário | Seu e-mail Google |
| E-mail de contato do desenvolvedor | Seu e-mail Google |

4. Em **Público**, mantenha o aplicativo como **Em teste** enquanto estiver validando. Adicione, em **Usuários de teste**, os e-mails Google que poderão entrar durante os testes.
5. Em **Escopos**, mantenha somente os escopos básicos de identidade: `openid`, `email` e `profile`. Eles permitem identificar o usuário, mostrar nome/e-mail e criar a sessão do Findash.
6. Salve as alterações.

> Enquanto o app estiver em modo de teste, apenas os e-mails adicionados como usuários de teste poderão concluir o login. Para liberar o uso público, será necessário publicar a tela de consentimento e, dependendo dos dados/escopos solicitados, cumprir os requisitos de verificação do Google. [1]

## 3. Criar o cliente OAuth 2.0 Web

1. No menu lateral, abra **Google Auth Platform → Clientes**. Na interface antiga, use **APIs e serviços → Credenciais**.
2. Clique em **Criar cliente** ou **Criar credenciais → ID do cliente OAuth**.
3. Em **Tipo de aplicativo**, selecione **Aplicativo da Web**.
4. Defina um nome reconhecível, por exemplo, `Findash LVO — Produção`.
5. Em **URIs de redirecionamento autorizados**, clique em **Adicionar URI** e cole, sem barra adicional no final:

```text
https://findash-lvo.vercel.app/api/auth/google/callback
```

6. Opcionalmente, se for testar localmente depois, adicione também:

```text
http://localhost:3000/api/auth/google/callback
```

7. Clique em **Criar**.

> O endereço de callback enviado pelo aplicativo deve ser **idêntico** a um URI autorizado: protocolo, domínio, caminho, maiúsculas/minúsculas e barra final precisam coincidir. Caso contrário, o Google retorna `redirect_uri_mismatch`. [1]

## 4. Guardar as credenciais corretamente

Ao concluir, o Google exibirá:

| Dado | Uso | Tratamento |
|---|---|---|
| **Client ID** | Identifica o aplicativo no fluxo OAuth | Pode ser informado para a configuração do projeto. |
| **Client Secret** | Autoriza o servidor a trocar o código OAuth por tokens | Mantenha somente como variável de ambiente segura. Nunca faça commit. |

Copie os dois valores agora. O Client Secret pode não ser exibido novamente; se ele for perdido, crie/rotacione um novo secret no cliente OAuth. [1]

## 5. Enviar os dados para a integração

Quando tiver as credenciais, retorne a esta conversa e informe:

```text
GOOGLE_CLIENT_ID=<seu Client ID>
GOOGLE_CLIENT_SECRET=<seu Client Secret>
```

As variáveis serão configuradas com segurança no ambiente do Findash e usadas somente pelo backend. Depois, a implementação direta do Google OAuth será publicada no Vercel e testaremos o login, retorno ao callback, sessão e logout.

## Checklist rápido

- [ ] Projeto criado/selecionado no Google Cloud.
- [ ] Tela de consentimento configurada e seu e-mail adicionado como usuário de teste.
- [ ] Cliente criado como **Aplicativo da Web**.
- [ ] Redirect URI de produção cadastrado exatamente como informado.
- [ ] Client ID e Client Secret copiados com segurança.

## Referências

[1]: https://developers.google.com/identity/protocols/oauth2/web-server "Google — Using OAuth 2.0 for Web Server Applications"
