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

O projeto usa Node.js 22, pnpm e um banco MySQL/TiDB compatível com Drizzle. Crie um arquivo `.env` no servidor com `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` e as demais variáveis fornecidas pelo ambiente de autenticação. No ambiente atual, use `OAUTH_SERVER_URL=https://api.manus.im` e `VITE_OAUTH_PORTAL_URL=https://manus.im`. O host `auth.manus.im` não resolve por DNS, `api.manus.im` é somente a API, e `manus.im/app-auth` foi confirmado como acessível. Não versionar esse arquivo.

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

### Build e início com porta fixa

Para construir e iniciar usando a porta externa fixa `3002`, defina no `.env`:

```env
APP_PORT=3002
```

A porta `3002` do servidor é encaminhada para a porta interna `3000` do Node. O script `start-docker.sh` lê `APP_PORT` diretamente do `.env`, portanto o build da imagem não muda a porta publicada e a mesma porta é preservada entre reinicializações. Se `3002` estiver ocupada, altere `APP_PORT` para outra porta fixa livre e mantenha o mesmo valor no acesso e no callback OAuth.

Para construir e iniciar usando a porta fixa:

```bash
./scripts/build-docker.sh
chmod +x scripts/start-docker.sh
./scripts/start-docker.sh
```

O endereço esperado será `http://192.168.1.27:3002/`. O callback OAuth correspondente deve ser cadastrado exatamente como `http://192.168.1.27:3002/api/oauth/callback` enquanto o acesso for feito por esse endereço. Em produção, prefira um domínio HTTPS e cadastre o callback com esse domínio.

O script remove apenas o container anterior chamado `findash-lvo`, usa a porta fixa definida em `APP_PORT` e mantém a porta interna `3000`. Se a porta estiver ocupada, o script falhará sem interromper os demais containers. Para outro ambiente, altere explicitamente `APP_PORT`:

```bash
APP_PORT=8085 ./scripts/start-docker.sh
```

Para usar Docker Compose mantendo a mesma porta fixa:

```bash
APP_PORT=3002 docker compose up -d --build
docker compose port findash-lvo 3000
```

O script e o Compose só escolhem uma porta aleatória se você definir explicitamente `APP_PORT=0`; esse modo não é recomendado quando o callback OAuth precisa permanecer estável.

Quando o comando manual `-p PORTA_EXTERNA:3000` for usado, o primeiro número é a porta do servidor Linux; o segundo `3000` é a porta interna do Node e não deve ser alterado. Se precisar investigar uma porta ocupada, descubra o processo responsável:

```bash
sudo ss -ltnp | grep ':3000'
docker ps --format 'table {{.ID}}\\t{{.Names}}\\t{{.Ports}}'
```

Se for um container antigo do Findash, remova-o e suba novamente:

```bash
docker rm -f findash-lvo
```

Se a porta pertencer a outro serviço, mantenha-o ativo e altere `APP_PORT` para outra porta fixa livre. A configuração `docker-compose.yml` usa `${APP_PORT:-3002}:3000`, portanto a porta permanece estável entre rebuilds. Consulte o mapeamento com `docker compose port findash-lvo 3000`.

O endereço usado pelo navegador deve ser HTTPS em produção e precisa estar autorizado no portal OAuth. O erro `OAUTH_SERVER_URL is not configured` significa que essa variável não estava presente no ambiente do container; a imagem agora possui o padrão `https://api.manus.im`, mas é recomendado declarar explicitamente o valor no `.env`. O botão deve abrir `https://manus.im/app-auth` neste ambiente. Não use `api.manus.im/app-auth`, pois esse host responde `404 Route Not Found`.

O analytics Umami é opcional no ambiente self-hosted e foi removido do HTML quando as variáveis de analytics não são configuradas, evitando o erro `Failed to decode param /%VITE_ANALYTICS_ENDPOINT%/umami`.

Cadastre o callback exatamente como `https://SEU_DOMINIO/api/oauth/callback`; em acesso por IP local, use `http://192.168.1.27:3002/api/oauth/callback` somente para testes. Em HTTP local, o frontend usa o cookie `oauth_state` com `SameSite=Lax`; em produção HTTPS, usa o cookie seguro `__Host-oauth_state`. O `redirectUri` é montado com `window.location.origin`, portanto não use um domínio diferente no cadastro do provedor.

Se o navegador mostrar `Servidor não encontrado` para o portal OAuth, verifique a conectividade com `curl -I https://manus.im/app-auth`. O portal OAuth precisa estar acessível pela rede; o container não consegue corrigir DNS, firewall, proxy ou bloqueio de saída HTTPS.

O servidor respeita `PORT` e deve ser colocado atrás de HTTPS em produção. O login usa o portal OAuth configurado no ambiente, que pode federar a conta Google; o backend identifica o método como Google quando informado pelo provedor e persiste `avatarUrl` ou `picture` em `users.avatarUrl`. Se o provedor não enviar a foto, a interface usa as iniciais do nome como fallback. Para validar a federação Google em produção, o administrador deve habilitar Google no portal OAuth e configurar os redirect URIs do domínio self-hosted.

## Desenvolvimento

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

O schema fica em `drizzle/schema.ts` e as migrações devem ser geradas com `pnpm drizzle-kit generate` e aplicadas ao banco antes do primeiro uso.
