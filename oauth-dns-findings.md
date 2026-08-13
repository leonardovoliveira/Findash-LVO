# OAuth DNS Findings

Em 13 de agosto de 2026, a partir do ambiente de desenvolvimento, `getent hosts auth.manus.im` não retornou endereço e `curl -I https://auth.manus.im/app-auth` falhou com `Could not resolve host: auth.manus.im`.

No mesmo ambiente, `getent hosts api.manus.im` retornou múltiplos endereços IPv4 e `curl -IL https://api.manus.im/app-auth` alcançou o host, retornando HTTP 404 para a requisição HEAD. Isso confirma conectividade DNS/TLS com `api.manus.im`, embora não prove o conteúdo final do endpoint de login.

Evidência fornecida pelo usuário: o navegador gerou uma URL em `https://auth.manus.im/app-auth?...`, mas exibiu `Servidor não encontrado` e `NS_ERROR_UNKNOWN_HOST`. O console confirmou falha de resolução do host. A URL local do callback era `http://192.168.1.27:3002/api/oauth/callback`.

Decisão técnica atual: usar `VITE_OAUTH_PORTAL_URL=https://api.manus.im` no ambiente do servidor porque esse host é resolvível, manter `OAUTH_SERVER_URL=https://api.manus.im`, e validar o fluxo `/app-auth` após rebuild. Em produção, usar domínio HTTPS e callback correspondente.

Fontes consultadas:
- https://open.manus.ai/docs/v2/authentication
- https://manus.im/login
- https://github.com/openperf/openclaw-cloud/blob/main/docs/deployment.md
