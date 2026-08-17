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
