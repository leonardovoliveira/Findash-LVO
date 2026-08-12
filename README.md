# Findash LVO

Sistema web de controle financeiro pessoal com autenticação OAuth, dashboard visual, lançamentos de entradas e saídas, filtros mensais e tema escuro como padrão.

## Execução com Docker

O projeto usa Node.js 22, pnpm e um banco MySQL/TiDB compatível com Drizzle. Crie um arquivo `.env` no servidor com `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e as demais variáveis fornecidas pelo ambiente de autenticação. Não versionar esse arquivo.

Para construir e iniciar:

```bash
docker build -t findash-lvo .
docker run --rm -p 3000:3000 --env-file .env findash-lvo
```

O servidor respeita `PORT` e deve ser colocado atrás de HTTPS em produção. O login é feito pelo fluxo OAuth configurado no ambiente; quando o provedor retorna a foto, ela é persistida em `users.avatarUrl`, com fallback visual pelas iniciais do nome.

## Desenvolvimento

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

O schema fica em `drizzle/schema.ts` e as migrações devem ser geradas com `pnpm drizzle-kit generate` e aplicadas ao banco antes do primeiro uso.
