export type AuthEventType =
  | "login_started"
  | "logout_requested"
  | "logout_succeeded"
  | "logout_failed";

export type AuthEvent = {
  type: AuthEventType;
  timestamp: string;
  details?: Record<string, string>;
};

const storageKey = "findash-lvo:auth-events";
const maxEvents = 50;

export function recordAuthEvent(type: AuthEventType, details?: Record<string, string>) {
  const event: AuthEvent = { type, timestamp: new Date().toISOString(), ...(details ? { details } : {}) };
  if (typeof window !== "undefined") {
    try {
      const previous = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as AuthEvent[];
      window.localStorage.setItem(storageKey, JSON.stringify([...previous, event].slice(-maxEvents)));
    } catch {
      // Diagnostics must never block authentication UX.
    }
  }
  if (typeof console !== "undefined") console.info("[AuthEvent]", event);
}

export function loadAuthEvents(): AuthEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
