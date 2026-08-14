# Achados das capturas OAuth

As duas primeiras capturas (`21.52.35` e `21.52.24`) não mostram o painel de configuração do projeto Manus nem campos OAuth. Elas mostram o Firefox DevTools na aba de rede, com requisições `POST https://r.stripe.com/b`, status HTTP 200 e cabeçalhos do Stripe. Não há `VITE_APP_ID`, `appId`, projeto Manus ou configuração de redirect URI visível nessas duas imagens.

Conclusão parcial: essas capturas não permitem identificar o valor real do VITE_APP_ID. É necessário inspecionar as imagens seguintes ou receber uma captura do painel Manus/Settings/Secrets sem dados privados.

As capturas `21.52.16` e `21.52.07` também não mostram o painel OAuth nem um appId. Elas exibem avisos do Firefox sobre source maps, proteção contra rastreamento e cookies de terceiros, além de requisições do Stripe e hCaptcha. Esses avisos são de serviços de pagamento/antibot e não identificam o projeto Manus OAuth.

As capturas `21.51.57` e `21.51.47` mostram o erro `ConnectError: [not_found] project not found` durante o carregamento de `manus.im/app-auth`. Também mostram requisições ao Stripe, hCaptcha, Google e endpoints Manus de publicação; não há um campo de configuração do painel com o appId real. Um identificador parcialmente visível na URL encapsulada por `m.stripe.network` não deve ser copiado nem compartilhado, pois pode ser sensível e não foi confirmado como VITE_APP_ID.

A conclusão permanece: o appId do OAuth precisa ser obtido nas variáveis/configurações do projeto Manus, não inferido do DevTools ou de requisições Stripe.

As capturas `21.51.34` e `21.51.11` mostram carregamento de recursos de `manus.im/app-auth` e um erro de Content-Security-Policy relacionado a script inline bloqueado. Não há tela de configurações nem campo VITE_APP_ID. O appId aparece apenas embutido na URL do navegador, e não deve ser inferido/copiado de uma captura que possa expor identificadores.

As capturas `21.50.54` e `21.50.39` confirmam que o domínio `manus.im` responde e que a URL acessada é `manus.im/app-auth`, mas a página mostra `Permissão negada` e `[not_found] project not found`. A barra de endereço contém um `appId` real parcialmente visível, porém ele aparece em uma captura pública e não deve ser repetido nem tratado como segredo ou como valor confirmado sem validação. O problema restante é a associação/validade do appId no projeto OAuth, não o endpoint ou a rede.
