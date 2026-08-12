# Findash LVO

Sistema web de controle financeiro pessoal com autenticação OAuth, dashboard visual, lançamentos de entradas e saídas, filtros mensais e tema escuro como padrão.

## Repositório

Código publicado em [github.com/leonardovoliveira/Findash-LVO](https://github.com/leonardovoliveira/Findash-LVO). O GitHub normaliza o nome técnico do repositório para `Findash-LVO`, pois espaços não fazem parte do identificador de URL; o nome exibido pela aplicação permanece **Findash LVO**.

## Atualizar uma instalação existente

Antes de executar o build no servidor, sincronize a cópia local com o repositório GitHub que contém o script de porta dinâmica:

```bash
cd /var/www/Findash-LVO
git remote -v
git fetch github main 2>/dev/null || git fetch origin main
git checkout main
git pull --ff-only github main 2>/dev/null || git pull --ff-only origin main
ls -l scripts/start-docker.sh docker-compose.yml
```

Se a pasta não for um clone Git ou estiver inconsistente, faça uma cópia do `.env` e recrie o diretório:

```bash
cd /var/www
cp Findash-LVO/.env /tmp/findash-lvo.env
mv Findash-LVO Findash-LVO.backup
git clone https://github.com/leonardovoliveira/Findash-LVO.git Findash-LVO
cp /tmp/findash-lvo.env Findash-LVO/.env
cd Findash-LVO
```

A presença de `scripts/start-docker.sh` confirma que a versão correta foi sincronizada. Só então execute o build e a inicialização abaixo.

## Execução com Docker

O projeto usa Node.js 22, pnpm e um banco MySQL/TiDB compatível com Drizzle. Crie um arquivo `.env` no servidor com `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e as demais variáveis fornecidas pelo ambiente de autenticação. Para o fluxo padrão, use `OAUTH_SERVER_URL=https://api.manus.im`. Não versionar esse arquivo.

### Build com autenticação OAuth

As variáveis `VITE_APP_ID` e `VITE_OAUTH_PORTAL_URL` são usadas pelo Vite no navegador e precisam estar disponíveis durante `docker build`. Passar apenas `--env-file .env` no `docker run` não corrige um bundle frontend que já foi gerado sem essas variáveis. Use o script de build, que lê o `.env` e repassa os valores como argumentos:

```bash
chmod +x scripts/build-docker.sh
./scripts/build-docker.sh
```

Depois inicie o container com porta automática:

```bash
./scripts/start-docker.sh
```

### Build e início sem porta fixa

Para construir e iniciar sem depender de uma porta fixa, use o script que procura uma porta livre entre `3000` e `3999`:

```bash
./scripts/build-docker.sh
chmod +x scripts/start-docker.sh
./scripts/start-docker.sh
```

O script remove apenas o container anterior chamado `findash-lvo`, escolhe uma porta externa livre e mantém a porta interna `3000`. Para solicitar uma porta específica, use `APP_PORT`; se ela estiver ocupada, o script falhará sem interromper os demais containers:

```bash
APP_PORT=8085 ./scripts/start-docker.sh
```

Para deixar a escolha totalmente a cargo do Docker usando Compose:

```bash
APP_PORT=0 docker compose up -d --build
docker compose port findash-lvo 3000
```

Quando o comando manual `-p PORTA_EXTERNA:3000` for usado, o primeiro número é a porta do servidor Linux; o segundo `3000` é a porta interna do Node e não deve ser alterado. Se precisar investigar uma porta ocupada, descubra o processo responsável:

```bash
sudo ss -ltnp | grep ':3000'
docker ps --format 'table {{.ID}}\\t{{.Names}}\\t{{.Ports}}'
```

Se for um container antigo do Findash, remova-o e suba novamente:

```bash
docker rm -f findash-lvo
```

Se a porta pertencer a outro serviço, mantenha-o ativo e use o script automático ou uma porta específica livre. A configuração `docker-compose.yml` usa `${APP_PORT:-0}:3000`; com `APP_PORT=0`, o Docker reserva uma porta externa livre automaticamente. Consulte a porta escolhida com `docker compose port findash-lvo 3000`.

O endereço usado pelo navegador deve ser HTTPS em produção e precisa estar autorizado no portal OAuth. O erro `OAUTH_SERVER_URL is not configured` significa que essa variável não estava presente no ambiente do container; a imagem agora possui o padrão `https://api.manus.im`, mas é recomendado declarar explicitamente o valor no `.env`.

O analytics Umami é opcional no ambiente self-hosted e foi removido do HTML quando as variáveis de analytics não são configuradas, evitando o erro `Failed to decode param /%VITE_ANALYTICS_ENDPOINT%/umami`.

Cadastre o callback exatamente como `https://SEU_DOMINIO/api/oauth/callback`; em acesso por IP, o callback deve usar o mesmo protocolo e host acessados pelo navegador. O `redirectUri` é montado com `window.location.origin`, portanto não use um domínio diferente no cadastro do provedor.

O servidor respeita `PORT` e deve ser colocado atrás de HTTPS em produção. O login usa o portal OAuth configurado no ambiente, que pode federar a conta Google; o backend identifica o método como Google quando informado pelo provedor e persiste `avatarUrl` ou `picture` em `users.avatarUrl`. Se o provedor não enviar a foto, a interface usa as iniciais do nome como fallback. Para validar a federação Google em produção, o administrador deve habilitar Google no portal OAuth e configurar os redirect URIs do domínio self-hosted.

## Desenvolvimento

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

O schema fica em `drizzle/schema.ts` e as migrações devem ser geradas com `pnpm drizzle-kit generate` e aplicadas ao banco antes do primeiro uso.
