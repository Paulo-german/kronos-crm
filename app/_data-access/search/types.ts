export type SearchResultType = 'contact' | 'company' | 'deal'

export interface SearchResultItem {
  id: string
  type: SearchResultType
  title: string
  subtitle: string | null
  href: string
}

/**
 * Grupo de resultados por entidade com contagem total (para saber se há mais resultados).
 * `totalCount` reflete o total no banco sem o LIMIT aplicado.
 */
export interface SearchResultGroup {
  items: SearchResultItem[]
  totalCount: number
}

export interface GlobalSearchResult {
  contacts: SearchResultGroup
  companies: SearchResultGroup
  deals: SearchResultGroup
  /** Soma dos totalCount dos 3 grupos */
  totalCount: number
  /** O termo buscado, retornado para o frontend usar no highlight */
  query: string
}
