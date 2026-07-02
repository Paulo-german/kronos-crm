'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Bot,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Handshake,
  Inbox,
  Loader2,
  MessageCircle,
  Phone,
  Unlink,
  User,
  UserCog,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/_lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { updateContact } from '@/_actions/contact/update-contact'
import { updateConversation } from '@/_actions/inbox/update-conversation'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { inboxKeys } from '../_lib/inbox-query-keys'

interface ChatSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: ConversationListDto
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
  members: AcceptedMemberDto[]
  isElevated: boolean
}

function getMemberInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Linha rótulo → valor (rótulo à esquerda em muted, valor à direita), reutilizada
// para os detalhes de contato, negociação, caixa de entrada e agente.
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm">{value}</span>
    </div>
  )
}

// Card de seção: dá contenção visual (superfície + borda) a cada bloco do sheet,
// substituindo os antigos <Separator /> planos por um ritmo mais legível.
function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  )
}

export function ChatSettingsSheet({
  open,
  onOpenChange,
  conversation,
  dealOptions,
  contactOptions,
  orgSlug,
  members,
  isElevated,
}: ChatSettingsSheetProps) {
  // Inline name edit
  const [editName, setEditName] = useState(conversation.contactName)
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false)
  const [dealPopoverOpen, setDealPopoverOpen] = useState(false)

  const queryClient = useQueryClient()

  const updateContactAction = useAction(updateContact, {
    onSuccess: () => {
      toast.success('Nome do contato atualizado.')
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations.all() })
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao atualizar contato.')
    },
  })

  const updateConversationAction = useAction(updateConversation, {
    onSuccess: () => {
      toast.success('Conversa atualizada.')
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations.all() })
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao atualizar conversa.')
    },
  })

  const handleSaveName = () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === conversation.contactName) return

    updateContactAction.execute({
      id: conversation.contactId,
      name: trimmed,
    })
  }

  const handleChangeContact = (contactId: string) => {
    if (contactId === conversation.contactId) {
      setContactPopoverOpen(false)
      return
    }
    updateConversationAction.execute({
      conversationId: conversation.id,
      contactId,
    })
    setContactPopoverOpen(false)
  }

  const handleChangeDeal = (dealId: string) => {
    if (dealId === conversation.dealId) {
      setDealPopoverOpen(false)
      return
    }
    updateConversationAction.execute({
      conversationId: conversation.id,
      dealId,
    })
    setDealPopoverOpen(false)
  }

  const handleUnlinkDeal = () => {
    updateConversationAction.execute({
      conversationId: conversation.id,
      dealId: null,
    })
  }

  const [pendingTransferName, setPendingTransferName] = useState<string | null>(
    null,
  )

  const transferAction = useAction(updateConversation, {
    onSuccess: () => {
      toast.success(
        pendingTransferName
          ? `Conversa transferida para ${pendingTransferName}`
          : 'Conversa transferida com sucesso.',
      )
      setPendingTransferName(null)
      queryClient.invalidateQueries({ queryKey: inboxKeys.conversations.all() })
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao transferir conversa.')
      setPendingTransferName(null)
    },
  })

  const handleTransferAssignee = (assignedTo: string) => {
    const targetMember = members.find((member) => member.userId === assignedTo)
    const targetName = targetMember?.user?.fullName ?? null
    setPendingTransferName(targetName)
    transferAction.execute({ conversationId: conversation.id, assignedTo })
  }

  const channelLabel =
    conversation.channel === 'WHATSAPP' ? 'WhatsApp' : 'Web Chat'

  const connectionTypeLabels: Record<string, string> = {
    EVOLUTION: 'Evolution (QR Code)',
    META_CLOUD: 'API Oficial (Meta)',
    Z_API: 'Z-API',
  }

  const selectedContact = contactOptions.find(
    (contact) => contact.id === conversation.contactId,
  )
  const selectedDeal = dealOptions.find(
    (deal) => deal.id === conversation.dealId,
  )

  // Defensivo: objeto pode chegar de um cache antigo sem o campo — não renderiza o badge
  const lifecycleConfig = conversation.contactLifecycleStage
    ? LIFECYCLE_STAGE_CONFIG[conversation.contactLifecycleStage]
    : null

  // Agente da conversa: no modo grupo o worker ativo prevalece sobre o agente do inbox
  const displayAgentName =
    conversation.activeAgentName ?? conversation.agentName
  const agentRouteId = conversation.activeAgentId ?? conversation.agentId
  const hasAgent = Boolean(displayAgentName ?? conversation.agentGroupName)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        overlayClassName="bg-black/50"
        className="overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Configurações da Conversa</SheetTitle>
          <SheetDescription>
            Gerencie o contato, negociação e informações desta conversa.
          </SheetDescription>
        </SheetHeader>

        {/* Hero — identidade do contato: avatar, nome, telefone e canal */}
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-primary/15 bg-gradient-to-b from-primary/10 to-transparent p-5 text-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {getMemberInitials(conversation.contactName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-base font-semibold leading-none">
              {conversation.contactName}
            </p>
            {conversation.contactPhone && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {conversation.contactPhone}
              </div>
            )}
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <MessageCircle className="h-3 w-3" />
            {channelLabel}
          </Badge>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            asChild
          >
            <Link href={`/org/${orgSlug}/contacts/${conversation.contactId}`}>
              Ver contato
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Contato — dados, renomear e trocar */}
          <SettingsSection icon={User} title="Contato">
            {/* Nome editável */}
            <div className="space-y-2">
              <Label
                htmlFor="contact-name"
                className="text-xs text-muted-foreground"
              >
                Nome
              </Label>
              <div className="flex gap-2">
                <Input
                  id="contact-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-9 bg-background"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveName()
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSaveName}
                  disabled={
                    updateContactAction.isPending ||
                    editName.trim() === conversation.contactName ||
                    !editName.trim()
                  }
                >
                  {updateContactAction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Dados do contato (read-only) */}
            <div className="space-y-2 border-t border-border/50 pt-3">
              {lifecycleConfig && (
                <InfoRow
                  label="Estágio"
                  value={
                    <Badge
                      variant="outline"
                      className={cn(
                        'gap-1 text-xs',
                        lifecycleConfig.badgeClassName,
                      )}
                    >
                      <lifecycleConfig.icon className="h-3 w-3" />
                      {lifecycleConfig.label}
                    </Badge>
                  }
                />
              )}
              {conversation.contactEmail && (
                <InfoRow label="Email" value={conversation.contactEmail} />
              )}
              {conversation.contactCompany && (
                <InfoRow label="Empresa" value={conversation.contactCompany} />
              )}
            </div>

            {/* Trocar contato */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Trocar contato
              </Label>
              <Popover
                open={contactPopoverOpen}
                onOpenChange={setContactPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactPopoverOpen}
                    className="w-full justify-between bg-background"
                    size="sm"
                  >
                    {selectedContact?.name ?? 'Selecione um contato...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar contato..." />
                    <CommandList>
                      <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contactOptions.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.name}
                            onSelect={() => handleChangeContact(contact.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                conversation.contactId === contact.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{contact.name}</span>
                              {contact.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </SettingsSection>

          {/* Negociação */}
          <SettingsSection icon={Handshake} title="Negociação">
            {/* Deal vinculado */}
            {conversation.dealId && conversation.dealTitle && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="max-w-[200px] truncate">
                    {conversation.dealTitle}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      asChild
                    >
                      <Link
                        href={`/org/${orgSlug}/crm/deals/${conversation.dealId}`}
                      >
                        Ver negociação
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={handleUnlinkDeal}
                      disabled={updateConversationAction.isPending}
                    >
                      <Unlink className="mr-1 h-3 w-3" />
                      Desvincular
                    </Button>
                  </div>
                </div>

                {/* Detalhes do deal (read-only) */}
                <div className="space-y-2 border-t border-border/50 pt-3">
                  {conversation.dealValue !== null && (
                    <InfoRow
                      label="Valor"
                      value={
                        <span className="font-medium">
                          {brlFormatter.format(conversation.dealValue)}
                        </span>
                      }
                    />
                  )}
                  {conversation.dealStage && (
                    <InfoRow label="Etapa" value={conversation.dealStage} />
                  )}
                </div>
              </div>
            )}

            {/* Combobox deal */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {conversation.dealId
                  ? 'Trocar negociação'
                  : 'Vincular negociação'}
              </Label>
              <Popover open={dealPopoverOpen} onOpenChange={setDealPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={dealPopoverOpen}
                    className="w-full justify-between bg-background"
                    size="sm"
                  >
                    {selectedDeal?.title ?? 'Selecione uma negociação...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar negociação..." />
                    <CommandList>
                      <CommandEmpty>
                        Nenhuma negociação encontrada.
                      </CommandEmpty>
                      <CommandGroup>
                        {dealOptions.map((deal) => (
                          <CommandItem
                            key={deal.id}
                            value={deal.title}
                            onSelect={() => handleChangeDeal(deal.id)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                conversation.dealId === deal.id
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{deal.title}</span>
                              {deal.contactName && (
                                <span className="text-xs text-muted-foreground">
                                  {deal.contactName}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </SettingsSection>

          {/* Responsável */}
          <SettingsSection icon={UserCog} title="Responsável">
            {/* Responsável atual */}
            <div className="flex items-center gap-2">
              {conversation.assigneeName ? (
                <>
                  <Avatar className="h-7 w-7">
                    <AvatarImage
                      src={conversation.assigneeAvatarUrl ?? undefined}
                    />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                      {getMemberInitials(conversation.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{conversation.assigneeName}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Sem responsável
                </span>
              )}
            </div>

            {/* Select de transferência — apenas para ADMIN/OWNER */}
            {isElevated && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Transferir conversa
                </Label>
                <Select
                  value={conversation.assignedTo ?? ''}
                  onValueChange={handleTransferAssignee}
                  disabled={transferAction.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um membro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => {
                      const displayName = member.user?.fullName ?? member.email
                      const initials = getMemberInitials(
                        member.user?.fullName ?? null,
                      )

                      return (
                        <SelectItem
                          key={member.id}
                          value={member.userId ?? member.id}
                          disabled={!member.userId}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarImage
                                src={member.user?.avatarUrl ?? undefined}
                              />
                              <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span>{displayName}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {transferAction.isPending && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Transferindo...
                  </div>
                )}
              </div>
            )}
          </SettingsSection>

          {/* Agente IA — sempre visível: mostra o agente vinculado ou um empty-state
              com atalho para vincular na config da caixa */}
          <SettingsSection icon={Bot} title="Agente IA">
            {hasAgent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-kronos-purple/10">
                    <Bot className="size-4 text-kronos-purple" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {displayAgentName ?? conversation.agentGroupName}
                    </p>
                    {conversation.agentGroupName && displayAgentName && (
                      <p className="truncate text-xs text-muted-foreground">
                        Grupo: {conversation.agentGroupName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/50 pt-3">
                  <InfoRow
                    label="Status"
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          conversation.aiPaused
                            ? 'text-muted-foreground'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
                        )}
                      >
                        {conversation.aiPaused ? 'Pausado' : 'Ativo'}
                      </Badge>
                    }
                  />
                  {conversation.currentStepName && (
                    <InfoRow
                      label="Etapa atual"
                      value={
                        <Badge variant="secondary" className="text-xs">
                          {conversation.currentStepName}
                        </Badge>
                      }
                    />
                  )}
                </div>

                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  asChild
                >
                  <Link
                    href={
                      agentRouteId
                        ? `/org/${orgSlug}/agents/ai-agent/${agentRouteId}`
                        : `/org/${orgSlug}/agents/ai-agent/groups`
                    }
                  >
                    Ver agente
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhum agente de IA vinculado a esta caixa de entrada.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  asChild
                >
                  <Link
                    href={`/org/${orgSlug}/inbox/settings/inboxes/${conversation.inboxId}`}
                  >
                    Vincular agente
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </SettingsSection>

          {/* Caixa de entrada — origem da conversa + atalho para a config */}
          <SettingsSection icon={Inbox} title="Caixa de Entrada">
            <div className="space-y-3">
              <InfoRow label="Nome" value={conversation.inboxName} />
              {conversation.channel === 'WHATSAPP' && (
                <InfoRow
                  label="Conexão"
                  value={
                    connectionTypeLabels[conversation.inboxConnectionType] ??
                    conversation.inboxConnectionType
                  }
                />
              )}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                asChild
              >
                <Link
                  href={`/org/${orgSlug}/inbox/settings/inboxes/${conversation.inboxId}`}
                >
                  Ver configurações da caixa
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </SettingsSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}
