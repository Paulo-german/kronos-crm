// lowercase + trim: @@unique no Postgres é case-sensitive, sem isso "Paulo@x.com" != "paulo@x.com" burla a constraint
export const normalizeEmail = (email?: string | null): string | null => {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}
