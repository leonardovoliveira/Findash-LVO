export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function createOAuthNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  // Fallback for legacy/insecure browser contexts where Web Crypto is unavailable.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Inicia o login Google direto no backend da aplicação. Esse endpoint mantém
// client ID e segredo exclusivamente no servidor e evita depender do portal
// Manus, que anteriormente gerava URLs com appId indefinido.
export function googleLoginUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/auth/google`;
}

export const startLogin = () => {
  window.location.href = googleLoginUrl(window.location.origin);
};
