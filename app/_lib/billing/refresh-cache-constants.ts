// Compartilhado entre client (hook de cooldown) e server (action) para garantir consistência
export const REFRESH_COOLDOWN_MS = 60_000

export const refreshCooldownStorageKey = (orgSlug: string) =>
  `subscription-cache-refresh-cooldown-${orgSlug}`
