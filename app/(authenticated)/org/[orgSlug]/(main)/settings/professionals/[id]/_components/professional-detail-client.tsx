'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CircleIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import type { MemberRole } from '@prisma/client'

import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { updateProfessional } from '@/_actions/professional/update-professional'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'
import type { ServiceDto } from '@/_data-access/service/get-services'

import GeneralTab from './general-tab'
import ServicesTab from './services-tab'
import WorkingHoursTab from './working-hours-tab'
import ExceptionsTab from './exceptions-tab'

interface ProfessionalDetailClientProps {
  professional: ProfessionalDetailDto
  services: ServiceDto[]
  orgSlug: string
  userRole: MemberRole
}

const ProfessionalDetailClient = ({
  professional,
  services,
  orgSlug,
  userRole,
}: ProfessionalDetailClientProps) => {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsString.withDefault('geral'),
  )

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'SUPPORT'
  const [isActive, setIsActive] = useState(professional.isActive)

  const { execute: executeToggle, isPending: isTogglingActive } = useAction(updateProfessional, {
    onSuccess: () => {
      toast.success(isActive ? 'Profissional desativado' : 'Profissional ativado')
    },
    onError: () => {
      setIsActive((prev) => !prev)
      toast.error('Erro ao alterar status do profissional')
    },
  })

  const handleToggleActive = (checked: boolean) => {
    setIsActive(checked)
    executeToggle({ id: professional.id, isActive: checked })
  }

  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background">
      <div className="flex flex-1 min-w-0 flex-col gap-6 overflow-x-hidden overflow-y-auto p-6">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/org/${orgSlug}/settings/professionals`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{professional.name}</h1>
          {isActive ? (
            <Badge
              variant="outline"
              className="h-6 gap-1.5 border-kronos-green/20 bg-kronos-green/10 px-2 text-xs font-semibold text-kronos-green hover:bg-kronos-green/20"
            >
              <CircleIcon className="h-1.5 w-1.5 fill-current" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="h-6 gap-1.5 px-2 text-xs font-semibold">
              <CircleIcon className="h-1.5 w-1.5 fill-current" />
              Inativo
            </Badge>
          )}
          {canManage && (
            <Switch
              checked={isActive}
              onCheckedChange={handleToggleActive}
              disabled={isTogglingActive}
            />
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-12 w-full grid-cols-4 rounded-md border border-border/50">
            <TabsTrigger value="geral" className="rounded-md py-2">
              Geral
            </TabsTrigger>
            <TabsTrigger value="servicos" className="rounded-md py-2">
              Serviços
            </TabsTrigger>
            <TabsTrigger value="jornada" className="rounded-md py-2">
              Jornada
            </TabsTrigger>
            <TabsTrigger value="excecoes" className="rounded-md py-2">
              Exceções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-6">
            <GeneralTab professional={professional} />
          </TabsContent>

          <TabsContent value="servicos" className="mt-6">
            <ServicesTab professional={professional} allServices={services} />
          </TabsContent>

          <TabsContent value="jornada" className="mt-6">
            <WorkingHoursTab professional={professional} />
          </TabsContent>

          <TabsContent value="excecoes" className="mt-6">
            <ExceptionsTab professional={professional} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ProfessionalDetailClient
