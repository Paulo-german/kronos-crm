import type { ChangelogEntryType } from '@prisma/client'

/**
 * DTO para uso no painel admin (inclui todos os campos administrativos).
 */
export interface ChangelogEntryAdminDto {
  id: string
  title: string
  description: string
  type: ChangelogEntryType
  isPublished: boolean
  publishedAt: Date | null
  createdBy: string
  createdByUser: {
    fullName: string | null
    email: string
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * DTO para uso na página pública (apenas campos visíveis ao visitante).
 * publishedAt é non-null: a query filtra apenas entradas publicadas.
 */
export interface ChangelogEntryPublicDto {
  id: string
  title: string
  description: string
  type: ChangelogEntryType
  publishedAt: Date
}
