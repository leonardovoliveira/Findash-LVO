export type LocalCategory = { label: string; icon: string };

const STORAGE_PREFIX = "findash-lvo:categories:";
const defaults: LocalCategory[] = [
  { label: "Moradia", icon: "⌂" },
  { label: "Alimentação", icon: "◒" },
  { label: "Transporte", icon: "↗" },
  { label: "Lazer", icon: "✦" },
  { label: "Salário", icon: "↙" },
  { label: "Investimentos", icon: "◈" },
];

export function categoryStorageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function normalizeLocalCategories(value: unknown): LocalCategory[] {
  if (!Array.isArray(value)) return [];
  const result: LocalCategory[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const icon = typeof item.icon === "string" && item.icon.trim() ? item.icon.trim() : "✦";
    if (label && !result.some(category => category.label.toLocaleLowerCase() === label.toLocaleLowerCase())) result.push({ label, icon });
  }
  return result;
}

export function loadLocalCategories(userId: number | string): LocalCategory[] {
  try {
    const raw = window.localStorage.getItem(categoryStorageKey(userId));
    const stored = raw ? normalizeLocalCategories(JSON.parse(raw)) : [];
    return [...defaults, ...stored.filter(category => !defaults.some(item => item.label.toLocaleLowerCase() === category.label.toLocaleLowerCase()))];
  } catch {
    return defaults;
  }
}

export function saveLocalCategories(userId: number | string, categories: LocalCategory[]) {
  const custom = normalizeLocalCategories(categories).filter(category => !defaults.some(item => item.label.toLocaleLowerCase() === category.label.toLocaleLowerCase()));
  window.localStorage.setItem(categoryStorageKey(userId), JSON.stringify(custom));
}

export function addLocalCategory(categories: LocalCategory[], category: LocalCategory) {
  const label = category.label.trim();
  if (!label) return categories;
  if (categories.some(item => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) return categories;
  return [...categories, { label, icon: category.icon.trim() || "✦" }];
}
