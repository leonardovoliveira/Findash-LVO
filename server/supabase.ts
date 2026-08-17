import { ENV } from "./_core/env.js";

export type FinanceStatePayload = {
  version: 1;
  transactions: unknown[];
  investments: unknown[];
  creditCards: unknown[];
  categories: unknown[];
};

type FinanceStateRow = {
  payload?: FinanceStatePayload;
  updated_at?: string;
};

function getSupabaseConfig() {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("Supabase não está configurado no backend");
  }
  return {
    url: ENV.supabaseUrl.replace(/\/$/, ""),
    key: ENV.supabaseServiceRoleKey,
  };
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function loadFinanceState(ownerKey: string): Promise<{ payload: FinanceStatePayload | null; updatedAt: string | null }> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({
    owner_key: `eq.${ownerKey}`,
    select: "payload,updated_at",
    limit: "1",
  });
  const response = await fetch(`${config.url}/rest/v1/finance_state?${query.toString()}`, {
    headers: headers(config.key),
  });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao carregar o estado financeiro`);
  const rows = await response.json() as FinanceStateRow[];
  return { payload: rows[0]?.payload ?? null, updatedAt: rows[0]?.updated_at ?? null };
}

export async function saveFinanceState(ownerKey: string, payload: FinanceStatePayload): Promise<{ updatedAt: string }> {
  const config = getSupabaseConfig();
  const updatedAt = new Date().toISOString();
  const response = await fetch(`${config.url}/rest/v1/finance_state`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ owner_key: ownerKey, payload, updated_at: updatedAt }),
  });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao salvar o estado financeiro`);
  return { updatedAt };
}


export type AuthSessionRecord = {
  sessionId: string;
  ownerOpenId: string;
  deviceLabel: string;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

type AuthSessionRow = {
  session_id: string;
  owner_key: string;
  device_label: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function mapAuthSession(row: AuthSessionRow): AuthSessionRecord {
  return {
    sessionId: row.session_id,
    ownerOpenId: row.owner_key,
    deviceLabel: row.device_label,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    lastSeenAt: new Date(row.last_seen_at),
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  };
}

export async function createSupabaseAuthSession(input: { sessionId: string; ownerOpenId: string; deviceLabel: string; userAgent: string | null; createdAt: Date; lastSeenAt: Date; expiresAt: Date }): Promise<void> {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/server_sessions`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ session_id: input.sessionId, owner_key: input.ownerOpenId, device_label: input.deviceLabel, user_agent: input.userAgent, created_at: input.createdAt.toISOString(), last_seen_at: input.lastSeenAt.toISOString(), expires_at: input.expiresAt.toISOString(), revoked_at: null }),
  });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao registrar a sessão`);
}

export async function getSupabaseAuthSession(sessionId: string): Promise<AuthSessionRecord | undefined> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({ session_id: `eq.${sessionId}`, revoked_at: "is.null", expires_at: `gt.${new Date().toISOString()}`, select: "session_id,owner_key,device_label,user_agent,created_at,last_seen_at,expires_at,revoked_at", limit: "1" });
  const response = await fetch(`${config.url}/rest/v1/server_sessions?${query.toString()}`, { headers: headers(config.key) });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao validar a sessão`);
  const rows = await response.json() as AuthSessionRow[];
  return rows[0] ? mapAuthSession(rows[0]) : undefined;
}

export async function touchSupabaseAuthSession(sessionId: string): Promise<void> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({ session_id: `eq.${sessionId}`, revoked_at: "is.null" });
  const response = await fetch(`${config.url}/rest/v1/server_sessions?${query.toString()}`, { method: "PATCH", headers: { ...headers(config.key), Prefer: "return=minimal" }, body: JSON.stringify({ last_seen_at: new Date().toISOString() }) });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao atualizar a sessão`);
}

export async function listSupabaseAuthSessions(ownerOpenId: string): Promise<AuthSessionRecord[]> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({ owner_key: `eq.${ownerOpenId}`, revoked_at: "is.null", expires_at: `gt.${new Date().toISOString()}`, select: "session_id,owner_key,device_label,user_agent,created_at,last_seen_at,expires_at,revoked_at", order: "last_seen_at.desc", limit: "50" });
  const response = await fetch(`${config.url}/rest/v1/server_sessions?${query.toString()}`, { headers: headers(config.key) });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao listar as sessões`);
  const rows = await response.json() as AuthSessionRow[];
  return rows.map(mapAuthSession);
}

export async function revokeSupabaseAuthSession(sessionId: string, ownerOpenId: string): Promise<void> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({ session_id: `eq.${sessionId}`, owner_key: `eq.${ownerOpenId}`, revoked_at: "is.null" });
  const response = await fetch(`${config.url}/rest/v1/server_sessions?${query.toString()}`, { method: "PATCH", headers: { ...headers(config.key), Prefer: "return=minimal" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao encerrar a sessão`);
}

export async function revokeOtherSupabaseAuthSessions(currentSessionId: string, ownerOpenId: string): Promise<void> {
  const config = getSupabaseConfig();
  const query = new URLSearchParams({ owner_key: `eq.${ownerOpenId}`, session_id: `neq.${currentSessionId}`, revoked_at: "is.null" });
  const response = await fetch(`${config.url}/rest/v1/server_sessions?${query.toString()}`, { method: "PATCH", headers: { ...headers(config.key), Prefer: "return=minimal" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
  if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status} ao encerrar as outras sessões`);
}
