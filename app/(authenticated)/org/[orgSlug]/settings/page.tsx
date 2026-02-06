import Link from 'next/link'
import { Building2, ChevronRight, CreditCard, UserCircle, Users } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import type { MemberRole } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

interface SettingsSection {
  title: string
  description: string
  href: string
  icon: LucideIcon
  allowedRoles: MemberRole[]
}

const ALL_ROLES: MemberRole[] = ['OWNER', 'ADMIN', 'MEMBER']
const ADMIN_ROLES: MemberRole[] = ['OWNER', 'ADMIN']

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Membros',
    description: 'Gerencie quem tem acesso à organização.',
    href: 'settings/members',
    icon: Users,
    allowedRoles: ADMIN_ROLES,
  },
  {
    title: 'Organização',
    description: 'Informações e configurações da organização.',
    href: 'settings/organization',
    icon: Building2,
    allowedRoles: ADMIN_ROLES,
  },
  {
    title: 'Faturamento',
    description: 'Gerencie seu plano e informações de pagamento.',
    href: 'settings/billing',
    icon: CreditCard,
    allowedRoles: ADMIN_ROLES,
  },
  {
    title: 'Perfil',
    description: 'Atualize suas informações pessoais.',
    href: 'settings/profile',
    icon: UserCircle,
    allowedRoles: ALL_ROLES,
  },
]

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { orgSlug } = await params
  const { userRole } = await getOrgContext(orgSlug)

  const visibleSections = SETTINGS_SECTIONS.filter((section) =>
    section.allowedRoles.includes(userRole),
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua conta e preferências.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleSections.map((section) => {
          const Icon = section.icon

          return (
            <Link
              key={section.href}
              href={`/org/${orgSlug}/${section.href}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
