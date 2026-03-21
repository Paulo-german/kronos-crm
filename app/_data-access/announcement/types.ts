export interface AnnouncementDto {
  id: string
  title: string
  body: string
  actionUrl: string | null
  targetOrgIds: string[]
  createdBy: string
  createdByUser: {
    fullName: string | null
    email: string
  }
  totalRecipients: number
  createdAt: Date
}

// DTO simplificado de Organization para uso no multi-select do form
export interface OrganizationOptionDto {
  id: string
  name: string
  slug: string
  memberCount: number
}
