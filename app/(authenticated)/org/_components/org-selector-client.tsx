'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Building2, Plus, ArrowRight, Loader2, LayoutGrid, MessageSquare, Bot, ChevronRight } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'
import { Avatar, AvatarFallback } from '@/_components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/_components/ui/sheet'
import { Input } from '@/_components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { createOrganization } from '@/_actions/organization/create-organization'
import { createOrganizationSchema } from '@/_actions/organization/create-organization/schema'
import type { MemberRole } from '@prisma/client'

type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>

interface Organization {
  id: string
  name: string
  slug: string
  role: MemberRole
  grantType?: string | null
  activeModules?: string[]
}

const PRODUCT_OPTIONS = [
  { key: 'crm', label: 'Kronos CRM', icon: LayoutGrid, module: 'crm', href: (slug: string) => `/org/${slug}/crm/home` },
  { key: 'inbox', label: 'Kronos Inbox', icon: MessageSquare, module: 'inbox', href: (slug: string) => `/org/${slug}/inbox/home` },
  { key: 'agents', label: 'Kronos Agents', icon: Bot, module: 'ai-agent', href: (slug: string) => `/org/${slug}/agents/home` },
]

interface OrgSelectorClientProps {
  organizations: Organization[]
  userFirstName: string | null
}

const AVATAR_PALETTE = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-indigo-500',
]

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
  SUPPORT: 'Suporte',
}

const ROLE_VARIANTS: Record<MemberRole, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
  SUPPORT: 'outline',
}

function getOrgColor(name: string): string {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function getOrgInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface OrgListItemProps {
  org: Organization
  onSelect: (slug: string) => void
}

function OrgListItemInternal({ org }: { org: Organization }) {
  const router = useRouter()
  const activeModules = org.activeModules ?? []
  const availableProducts = PRODUCT_OPTIONS.filter((product) => activeModules.includes(product.module))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card p-4 text-left transition-all duration-150 hover:border-primary/40 hover:bg-primary/5"
        >
          <Avatar className="size-11 shrink-0">
            <AvatarFallback className={cn('text-sm font-semibold text-white', getOrgColor(org.name))}>
              {getOrgInitials(org.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate text-sm font-medium leading-none">{org.name}</p>
            <Badge variant={ROLE_VARIANTS[org.role]} className="shrink-0 text-xs">
              {ROLE_LABELS[org.role]}
            </Badge>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Entrar em
        </p>
        {availableProducts.map((productOption) => {
          const Icon = productOption.icon
          return (
            <button
              key={productOption.key}
              type="button"
              onClick={() => router.push(productOption.href(org.slug))}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
            >
              <Icon className="size-4 text-muted-foreground" />
              {productOption.label}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

function OrgListItem({ org, onSelect }: OrgListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(org.slug)}
      className="group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card p-4 text-left transition-all duration-150 hover:border-primary/40 hover:bg-primary/5"
    >
      <Avatar className="size-11 shrink-0">
        <AvatarFallback
          className={cn(
            'text-sm font-semibold text-white',
            getOrgColor(org.name),
          )}
        >
          {getOrgInitials(org.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-sm font-medium leading-none">{org.name}</p>
        <Badge variant={ROLE_VARIANTS[org.role]} className="shrink-0 text-xs">
          {ROLE_LABELS[org.role]}
        </Badge>
      </div>

      <ArrowRight className="size-4 shrink-0 translate-x-2 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  )
}

export function OrgSelectorClient({
  organizations,
  userFirstName,
}: OrgSelectorClientProps) {
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const isInternalOrg = (org: Organization) => org.grantType === 'INTERNAL'

  const form = useForm<CreateOrganizationSchema>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '' },
  })

  const { execute, isPending } = useAction(createOrganization, {
    onSuccess: ({ data }) => {
      if (data?.slug) {
        toast.success('Organização criada com sucesso!')
        setIsSheetOpen(false)
        form.reset()
        router.push(`/org/${data.slug}/dashboard`)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar organização.')
    },
  })

  const onSubmit = (data: CreateOrganizationSchema) => {
    execute(data)
  }

  const handleSelectOrg = (slug: string) => {
    router.push(`/org/${slug}/dashboard`)
  }

  const hasOrgs = organizations.length > 0

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-1.5 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {userFirstName ? `Olá, ${userFirstName}` : 'Seus workspaces'}
        </h1>
        <p className="text-muted-foreground">
          {hasOrgs
            ? 'Selecione um workspace para continuar'
            : 'Você ainda não faz parte de nenhuma organização.'}
        </p>
      </div>

      {hasOrgs && (
        <div className="space-y-2">
          {organizations.map((org) =>
            isInternalOrg(org) ? (
              <OrgListItemInternal key={org.id} org={org} />
            ) : (
              <OrgListItem key={org.id} org={org} onSelect={handleSelectOrg} />
            ),
          )}
        </div>
      )}

      {!hasOrgs && (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Building2 className="size-10 opacity-30" />
          <p className="text-sm">Crie uma organização para começar.</p>
        </div>
      )}

      {hasOrgs && (
        <div className="relative flex items-center">
          <Separator className="flex-1" />
          <span className="mx-3 text-xs uppercase tracking-wider text-muted-foreground">
            ou
          </span>
          <Separator className="flex-1" />
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button className="w-full" variant="default">
            <Plus className="mr-2 size-4" />
            Criar nova organização
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Criar Organização</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              className="space-y-4 py-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Organização</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Minha Empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Organização'
                )}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
