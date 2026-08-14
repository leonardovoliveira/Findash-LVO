# Diagnóstico da implantação Vercel

## Evidências

- Deployment inicial em `https://findash-lvo.vercel.app/` retornava `Content-Type: application/javascript` e o conteúdo de `dist/index.js`, exibindo código-fonte/bundle do servidor na raiz.
- Os logs do deployment `dpl_6heaMWUWvkTFEnsKfrYwQ9BnymJL` confirmaram que `pnpm build` gerava corretamente `dist/public` e `dist/index.js`; o problema era a saída Vercel sem `outputDirectory` explícito.
- Após `vercel.json` com `outputDirectory: dist/public`, o deployment `dpl_H2koEtMJP3yBMaVwwJdizhsFbb2P` retornou HTML com título `Findash LVO — Finanças sem ruído` e a interface React correta.
- A primeira versão da função `/api/index.ts` falhou no runtime com `ERR_MODULE_NOT_FOUND` porque imports locais ESM sem extensão não foram resolvidos pela Vercel. O commit `650986d` alterou os imports para `.js`; é necessário validar o próximo deployment.

## Referências externas

- Vercel — Using Express.js with Vercel: https://vercel.com/kb/guide/using-express-with-vercel
- Vercel — Using the Node.js Runtime with Vercel Functions: https://vercel.com/docs/functions/runtimes/node-js

A documentação oficial recomenda uma entrada Express em `api/index.ts` e uma configuração de rewrite para encaminhar as rotas ao Express. O runtime Node da Vercel suporta TypeScript e funções serverless; aplicações self-hosted continuam usando Docker.
