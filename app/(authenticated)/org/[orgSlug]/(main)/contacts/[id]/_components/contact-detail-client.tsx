'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useSmartNavigation } from '@/_hooks/use-smart-navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  AxeIcon,
  Briefcase,
  Building2,
  CircleIcon,
  Loader2,
  Mail,
  Phone,
  User2,
  UserCog,
} from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

import type { ContactDetailDto } from '@/_data-access/contact/get-contact-by-id'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { LifecycleHistoryItemDto } from '@/_data-access/lifecycle/types'
import { InlineTextField } from '@/_components/form-controls/inline-text-field'
import { CompanyCombobox } from '../../_components/company-combobox'
import { useContactFieldUpdate } from '../_hooks/use-contact-field-update'
import { formatPhone } from '@/_utils/format-phone'
import { formatCpf } from '@/_lib/utils'
import { transferContact } from '@/_actions/contact/transfer-contact'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import { LifecycleStatusCard } from './lifecycle-status-card'
import { CaptureSourceCard } from './capture-source-card'
import { ContactLifecycleTimeline } from './contact-lifecycle-timeline'
import type { MemberRole } from '@prisma/client'
import { FieldType } from '@prisma/client'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface ContactDetailClientProps {
  contact: ContactDetailDto
  companies: CompanyDto[]
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  hidePiiFromMembers: boolean
  orgSlug: string
  lifecycleHistory: LifecycleHistoryItemDto[]
  customFieldDefinitions?: FieldDefinitionDto[]
  customFieldValues?: Record<string, string | null>
}

const ContactDetailClient = ({
  contact,
  companies,
  members,
  currentUserId,
  userRole,
  hidePiiFromMembers,
  orgSlug,
  lifecycleHistory,
  customFieldDefinitions = [],
  customFieldValues = {},
}: ContactDetailClientProps) => {
  const isPiiRestricted = userRole === 'MEMBER' && hidePiiFromMembers
  const { handleBack } = useSmartNavigation({ fallbackPath: `/org/${orgSlug}/contacts` })
  const { updateField, isPending } = useContactFieldUpdate({
    contactId: contact.id,
  })

  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined)
  const [cascadeDeals, setCascadeDeals] = useState(true)

  const { execute: executeTransfer, isPending: isTransferring } = useAction(
    transferContact,
    {
      onSuccess: () => {
        toast.success('Contato transferido com sucesso!', { position: 'bottom-right' })
        setIsTransferOpen(false)
        setSelectedMemberId(undefined)
        setCascadeDeals(true)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao transferir contato.', { position: 'bottom-right' })
      },
    },
  )

  const canTransfer =
    userRole === 'ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'SUPPORT' ||
    contact.assignedTo === currentUserId

  const handleTransfer = () => {
    if (selectedMemberId) {
      executeTransfer({ contactId: contact.id, newAssigneeId: selectedMemberId, cascadeDeals })
    }
  }

  const handleCloseTransferDialog = (open: boolean) => {
    if (!open) {
      setSelectedMemberId(undefined)
      setCascadeDeals(true)
    }
    setIsTransferOpen(open)
  }

  const assignableMembers = members.filter((member) => member.user?.fullName)

  const stageConfig = LIFECYCLE_STAGE_CONFIG[contact.lifecycleStage]
  const statusConfig = CUSTOMER_STATUS_CONFIG[contact.customerStatus]

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header: Nome + Badges + Ações */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <InlineTextField
              value={contact.name}
              onSave={(value) => updateField('name', value)}
              isPending={isPending}
              displayClassName="text-2xl font-bold"
              inputClassName="h-9 min-w-[300px]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`h-6 gap-1.5 px-2 text-xs font-medium ${stageConfig.badgeClassName}`}
              >
                <stageConfig.icon className="h-3 w-3" />
                {stageConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={`h-6 px-2 text-xs font-medium ${statusConfig.badgeClassName}`}
              >
                {statusConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={`h-6 gap-1.5 px-2 text-xs font-semibold transition-colors ${
                  contact.isDecisionMaker
                    ? 'border-kronos-green/20 bg-kronos-green/10 text-kronos-green'
                    : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
                }`}
              >
                <CircleIcon className="h-1.5 w-1.5 fill-current" />
                {contact.isDecisionMaker ? 'Decisor' : 'Não Decisor'}
              </Badge>
            </div>
          </div>
          {canTransfer && userRole !== 'MEMBER' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferOpen(true)}
              disabled={isPending || isTransferring}
            >
              <UserCog className="mr-2 h-4 w-4" />
              Transferir
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle & Status */}
      <LifecycleStatusCard contact={contact} userRole={userRole} />

      {/* Origem & Captura */}
      <CaptureSourceCard
        firstCaptureChannel={contact.firstCaptureChannel}
        firstCaptureAt={contact.firstCaptureAt}
        lastCaptureChannel={contact.lastCaptureChannel}
        lastCaptureAt={contact.lastCaptureAt}
      />

      {/* Grid: Info + Empresa */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Informações de Contato */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
              {isPiiRestricted ? (
                <span className="text-sm font-medium">{contact.email ?? '—'}</span>
              ) : (
                <InlineTextField
                  value={contact.email}
                  onSave={(value) => updateField('email', value)}
                  isPending={isPending}
                  placeholder="Adicionar"
                  displayClassName="font-medium"
                  inputClassName="h-7 w-[180px]"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <User2 className="h-3.5 w-3.5" />
                Cargo
              </span>
              <InlineTextField
                value={contact.role}
                onSave={(value) => updateField('role', value)}
                isPending={isPending}
                placeholder="Adicionar"
                displayClassName="font-medium"
                inputClassName="h-7 w-[180px]"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Telefone
              </span>
              {isPiiRestricted ? (
                <span className="text-sm font-medium">{contact.phone ?? '—'}</span>
              ) : (
                <InlineTextField
                  value={formatPhone(contact.phone)}
                  onSave={(value) => updateField('phone', value)}
                  isPending={isPending}
                  placeholder="Adicionar"
                  displayClassName="font-medium"
                  inputClassName="h-7 w-[180px]"
                />
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <Label
                htmlFor="decision-maker-page"
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <AxeIcon className="h-3.5 w-3.5" />
                Decisor
              </Label>
              <Switch
                id="decision-maker-page"
                checked={contact.isDecisionMaker}
                onCheckedChange={(checked) => updateField('isDecisionMaker', checked)}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Empresa */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyCombobox
              value={contact.companyId ?? undefined}
              options={companies.map((company) => ({ id: company.id, name: company.name }))}
              onChange={(value) => updateField('companyId', value || null)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Deals vinculados */}
      {contact.deals?.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Briefcase className="h-4 w-4" />
              Negociações Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {contact.deals.map((deal) => (
                <li key={deal.id} className="text-sm">
                  <Link
                    href={`/crm/deals/${deal.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {deal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Campos personalizados — exibe apenas quando há campos configurados com valores */}
      {customFieldDefinitions.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              Campos personalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {customFieldDefinitions.map((definition) => {
                const rawValue = customFieldValues[definition.id]
                // SELECT → rótulo da opção; CPF → formatado com máscara; demais → valor bruto
                const displayValue =
                  definition.type === FieldType.SELECT && rawValue
                    ? (definition.options?.find((option) => option.value === rawValue)?.label ??
                      rawValue)
                    : definition.type === FieldType.CPF && rawValue
                      ? formatCpf(rawValue)
                      : rawValue
                return (
                  <div key={definition.id} className="space-y-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {definition.label}
                    </dt>
                    <dd className="text-sm">
                      {displayValue ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Lifecycle */}
      <ContactLifecycleTimeline items={lifecycleHistory} />

      {/* Responsável */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCog className="h-4 w-4" />
          <span>Responsável pelo Contato:</span>
          <span className="font-medium text-foreground">
            {members.find((member) => member.userId === contact.assignedTo)?.user?.fullName ||
              'Não atribuído'}
          </span>
        </div>
      </div>

      {/* Dialog de Transferência */}
      <Dialog open={isTransferOpen} onOpenChange={handleCloseTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir Contato</DialogTitle>
            <DialogDescription>
              Selecione o novo responsável por este contato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-owner-page">Novo Responsável</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger id="new-owner-page" className="w-full">
                  <SelectValue placeholder="Selecione um membro..." />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.userId as string}>
                      {member.user?.fullName} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`flex items-start gap-3 rounded-md border p-3 transition-opacity ${
                contact.deals.length === 0 ? 'opacity-60' : ''
              }`}
            >
              <Checkbox
                id="cascade-deals"
                checked={contact.deals.length > 0 ? cascadeDeals : false}
                disabled={contact.deals.length === 0}
                onCheckedChange={(checked) => setCascadeDeals(checked === true)}
                className="mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="cascade-deals" className="cursor-pointer text-sm font-medium">
                  Transferir também os negócios vinculados
                </Label>
                {contact.deals.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {contact.deals.map((deal) => (
                      <li key={deal.id} className="flex items-center gap-1.5">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                        {deal.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhum negócio vinculado a este contato.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCloseTransferDialog(false)}
              disabled={isTransferring}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={!selectedMemberId || isTransferring}>
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                'Transferir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ContactDetailClient
