export type SearchResultType = 'contact' | 'company' | 'deal'

export interface SearchResultItem {
  id: string
  type: SearchResultType
  title: string
  subtitle: string | null
  href: string
}

export interface GlobalSearchResult {
  contacts: SearchResultItem[]
  companies: SearchResultItem[]
  deals: SearchResultItem[]
  totalCount: number
}
