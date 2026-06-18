'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { HelpCircle, Loader2, UserCog } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { BackButton } from '@/_components/layout/back-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
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
import type { ContactPrivacyDto } from '@/_data-access/privacy/get-contact-privacy'
import { InlineTextField } from '@/_components/form-controls/inline-text-field'
import { CompanyCombobox } from '../../_components/company-combobox'
import { useContactFieldUpdate } from '../_hooks/use-contact-field-update'
import { formatPhone } from '@/_utils/format-phone'
import { transferContact } from '@/_actions/contact/transfer-contact'
import { LifecycleStatusCard } from './lifecycle-status-card'
import { CaptureSourceCard } from './capture-source-card'
import { ContactLifecycleTimeline } from './contact-lifecycle-timeline'
import { CustomFieldInlineEditor } from './custom-field-inline-editor'
import { ContactPrivacyCard } from './contact-privacy-card'
import type { MemberRole } from '@prisma/client'
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
  privacy: ContactPrivacyDto | null
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
  privacy,
}: ContactDetailClientProps) => {
  const isPiiRestricted = userRole === 'MEMBER' && hidePiiFromMembers
  const { updateField, isPending } = useContactFieldUpdate({
    contactId: contact.id,
  })

  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    undefined,
  )
  const [cascadeDeals, setCascadeDeals] = useState(true)

  const { execute: executeTransfer, isPending: isTransferring } = useAction(
    transferContact,
    {
      onSuccess: () => {
        toast.success('Contato transferido com sucesso!', {
          position: 'bottom-right',
        })
        setIsTransferOpen(false)
        setSelectedMemberId(undefined)
        setCascadeDeals(true)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao transferir contato.', {
          position: 'bottom-right',
        })
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
      executeTransfer({
        contactId: contact.id,
        newAssigneeId: selectedMemberId,
        cascadeDeals,
      })
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

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <BackButton
            orgSlug={orgSlug}
            fallbackPath={`/org/${orgSlug}/contacts`}
          />
        </div>

        <div className="flex items-start justify-between">
          <div>
            <InlineTextField
              value={contact.name}
              onSave={(value) => updateField('name', value)}
              isPending={isPending}
              displayClassName="text-2xl font-bold"
              inputClassName="h-9 min-w-[300px]"
            />
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

      {/* Tabs */}
      <Tabs defaultValue="summary" className="h-fit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" className="rounded-md py-2">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-md py-2">
            Privacidade
          </TabsTrigger>
        </TabsList>

        {/* Aba Resumo */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[35%_1fr]">
            {/* Coluna esquerda */}
            <div className="space-y-4">
              {/* Card Informações de Contato */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Dados do Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    {isPiiRestricted ? (
                      <span className="text-sm font-medium">
                        {contact.email ?? '—'}
                      </span>
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
                    <span className="text-muted-foreground">Cargo</span>
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
                    <span className="text-muted-foreground">Telefone</span>
                    {isPiiRestricted ? (
                      <span className="text-sm font-medium">
                        {contact.phone ?? '—'}
                      </span>
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
                      className="flex items-center gap-1 text-muted-foreground"
                    >
                      Decisor
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground/50" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px] text-center">
                          Indica se esta pessoa tem poder de decisão na compra.
                          Útil para priorizar follow-ups e abordagens
                          comerciais.
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Switch
                      id="decision-maker-page"
                      checked={contact.isDecisionMaker}
                      onCheckedChange={(checked) =>
                        updateField('isDecisionMaker', checked)
                      }
                      disabled={isPending}
                    />
                  </div>

                  {customFieldDefinitions.length > 0 && (
                    <>
                      <div className="border-t" />
                      {customFieldDefinitions.map((definition) => {
                        const rawValue =
                          customFieldValues[definition.id] ?? null
                        return (
                          <div
                            key={definition.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {definition.label}
                            </span>
                            <CustomFieldInlineEditor
                              contactId={contact.id}
                              definition={definition}
                              rawValue={rawValue}
                            />
                          </div>
                        )
                      })}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Origem & Captura */}
              <CaptureSourceCard
                firstCaptureChannel={contact.firstCaptureChannel}
                firstCaptureAt={contact.firstCaptureAt}
                lastCaptureChannel={contact.lastCaptureChannel}
                lastCaptureAt={contact.lastCaptureAt}
              />

              {/* Card Empresa */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyCombobox
                    value={contact.companyId ?? undefined}
                    options={companies.map((company) => ({
                      id: company.id,
                      name: company.name,
                    }))}
                    onChange={(value) =>
                      updateField('companyId', value || null)
                    }
                  />
                </CardContent>
              </Card>

              {/* Deals vinculados */}
              {contact.deals?.length > 0 && (
                <Card className="border-border/50 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Negociações Vinculadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {contact.deals.map((deal) => (
                        <li key={deal.id} className="text-sm">
                          <Link
                            href={`/org/${orgSlug}/crm/deals/${deal.id}`}
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

              {/* Responsável */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCog className="h-4 w-4" />
                  <span>Responsável pelo Contato:</span>
                  <span className="font-medium text-foreground">
                    {members.find(
                      (member) => member.userId === contact.assignedTo,
                    )?.user?.fullName || 'Não atribuído'}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna direita */}
            <div className="space-y-4">
              {/* Ciclo & Status */}
              <LifecycleStatusCard contact={contact} userRole={userRole} />

              {/* Histórico de Lifecycle */}
              <ContactLifecycleTimeline items={lifecycleHistory} />
            </div>
          </div>
        </TabsContent>

        {/* Aba Privacidade */}
        <TabsContent value="privacy" className="mt-4">
          <ContactPrivacyCard
            privacy={privacy}
            contactId={contact.id}
            userRole={userRole}
            anonymizedAt={contact.anonymizedAt}
          />
        </TabsContent>
      </Tabs>

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
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
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
                <Label
                  htmlFor="cascade-deals"
                  className="cursor-pointer text-sm font-medium"
                >
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
            <Button
              onClick={handleTransfer}
              disabled={!selectedMemberId || isTransferring}
            >
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
