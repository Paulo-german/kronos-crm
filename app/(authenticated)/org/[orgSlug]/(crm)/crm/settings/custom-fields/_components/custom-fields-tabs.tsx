'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/_components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'

interface CustomFieldsTabsProps {
  orgSlug: string
}

/**
 * Navegação por entidade da tela de campos personalizados.
 * A aba ativa é derivada do pathname (segmento após `custom-fields`).
 * O estilo (altura, fundo, estado ativo) vem do componente base `Tabs`.
 */
export function CustomFieldsTabs({ orgSlug }: CustomFieldsTabsProps) {
  const pathname = usePathname()
  const activeTab = pathname.includes('/custom-fields/deal')
    ? 'deal'
    : 'contact'

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="contact" asChild>
          <Link href={`/org/${orgSlug}/crm/settings/custom-fields/contact`}>
            Contatos
          </Link>
        </TabsTrigger>
        <TabsTrigger value="deal" asChild>
          <Link href={`/org/${orgSlug}/crm/settings/custom-fields/deal`}>
            Negociações
          </Link>
        </TabsTrigger>
        <TabsTrigger value="company" disabled>
          Empresas
          <Badge variant="secondary" className="ml-2 text-xs">
            Em breve
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
