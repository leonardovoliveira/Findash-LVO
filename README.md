# Findash LVO

Sistema web de controle financeiro pessoal com autenticação OAuth, dashboard visual, lançamentos de entradas e saídas, filtros mensais e tema escuro como padrão.

## Repositório

Código publicado em [github.com/leonardovoliveira/Findash-LVO](https://github.com/leonardovoliveira/Findash-LVO). O GitHub normaliza o nome técnico do repositório para `Findash-LVO`, pois espaços não fazem parte do identificador de URL; o nome exibido pela aplicação permanece **Findash LVO**.

## Execução com Docker

O projeto usa Node.js 22, pnpm e um banco MySQL/TiDB compatível com Drizzle. Crie um arquivo `.env` no servidor com `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e as demais variáveis fornecidas pelo ambiente de autenticação. Não versionar esse arquivo.

Para construir e iniciar:

```bash
docker build -t findash-lvo .
docker run --rm -p 3000:3000 --env-file .env findash-lvo
```

O servidor respeita `PORT` e deve ser colocado atrás de HTTPS em produção. O login usa o portal OAuth configurado no ambiente, que pode federar a conta Google; o backend identifica o método como Google quando informado pelo provedor e persiste `avatarUrl` ou `picture` em `users.avatarUrl`. Se o provedor não enviar a foto, a interface usa as iniciais do nome como fallback. Para validar a federação Google em produção, o administrador deve habilitar Google no portal OAuth e configurar os redirect URIs do domínio self-hosted.

## Desenvolvimento

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

O schema fica em `drizzle/schema.ts` e as migrações devem ser geradas com `pnpm drizzle-kit generate` e aplicadas ao banco antes do primeiro uso.
