export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { recordAuthEvent } from "@/lib/authEvents";

// Inicia o login Google direto no backend da aplicação. Esse endpoint mantém
// client ID e segredo exclusivamente no servidor e evita depender do portal
// Manus, que anteriormente gerava URLs com appId indefinido.
export function googleLoginUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/auth/google`;
}

export const startLogin = () => {
  recordAuthEvent("login_started");
  window.location.href = googleLoginUrl(window.location.origin);
};
