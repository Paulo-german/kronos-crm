'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CircleIcon,
  Bot,
  Calendar,
  MessageSquare,
  Edit,
  Users,
  AlertTriangleIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Sheet } from '@/_components/ui/sheet'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import type { InboxDetailDto } from '@/_data-access/inbox/get-inbox-by-id'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution/types-instance'
import type { MemberRole } from '@prisma/client'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import { updateInbox } from '@/_actions/inbox/update-inbox'
import { linkInboxToAgent } from '@/_actions/inbox/link-inbox-to-agent'
import UpsertInboxSheetContent from '../../_components/upsert-inbox-sheet-content'
import InboxConnectionCard from './inbox-connection-card'
import MetaConnectionCard from './meta-connection-card'
import ZApiConnectionCard from './zapi-connection-card'
import ConnectionProviderSelector from './connection-provider-selector'

interface AgentOption {
  id: string
  name: string
}

interface InboxDetailClientProps {
  inbox: InboxDetailDto
  agentOptions: AgentOption[]
  userRole: MemberRole
  orgSlug: string
  connectionStats: AgentConnectionStats | null
  instanceInfo: EvolutionInstanceInfo | null
  members: AcceptedMemberDto[]
  pipelines: OrgPipelineDto[]
  metaCloudEnabled: boolean
}

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB_CHAT: 'Web Chat',
}

const InboxDetailClient = ({
  inbox,
  agentOptions,
  userRole,
  orgSlug,
  connectionStats,
  instanceInfo,
  members,
  pipelines,
  metaCloudEnabled,
}: InboxDetailClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [localDistributionUserIds, setLocalDistributionUserIds] = useState(inbox.distributionUserIds)

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateInbox,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada atualizada!')
        setIsEditOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar.')
      },
    },
  )

  const { execute: executeInlineUpdate } = useAction(
    updateInbox,
    {
      onSuccess: () => {
        toast.success('Configuração salva!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao salvar.')
      },
    },
  )

  const { execute: executeLinkAgent, isPending: isLinking } = useAction(
    linkInboxToAgent,
    {
      onSuccess: () => {
        toast.success('Agente vinculado com sucesso!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao vincular agente.')
      },
    },
  )

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(inbox.createdAt))

  const assignableMembers = members.filter((member) => member.userId)

  const handleToggleDistributionUser = (userId: string) => {
    setLocalDistributionUserIds((current) => {
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
      executeInlineUpdate({ id: inbox.id, distributionUserIds: updated })
      return updated
    })
  }

  /**
   * Decide qual card de conexao renderizar com base no estado atual do inbox.
   *
   * Logica de decisao:
   * - META_CLOUD com phoneNumberId preenchido -> MetaConnectionCard (conectado)
   * - EVOLUTION com evolutionInstanceName preenchido -> InboxConnectionCard (Evolution conectado)
   * - Sem conexao ativa -> ConnectionProviderSelector
   */
  const renderConnectionSection = () => {
    const isMetaConnected =
      inbox.connectionType === 'META_CLOUD' && !!inbox.metaPhoneNumberId
    const isZApiConnected =
      inbox.connectionType === 'Z_API' && !!inbox.zapiInstanceId
    const isEvolutionConnected = !!inbox.evolutionInstanceName

    if (isZApiConnected) {
      return (
        <ZApiConnectionCard
          inboxId={inbox.id}
          canManage={canManage}
          isConnected
          zapiPhone={null}
          connectionStats={connectionStats}
        />
      )
    }

    if (isMetaConnected) {
      return (
        <MetaConnectionCard
          inboxId={inbox.id}
          canManage={canManage}
          isConnected
          metaPhoneDisplay={inbox.metaPhoneDisplay}
          metaWabaId={inbox.metaWabaId}
          connectionStats={connectionStats}
        />
      )
    }

    if (isEvolutionConnected) {
      return (
        <InboxConnectionCard
          inboxId={inbox.id}
          canManage={canManage}
          connectionStats={connectionStats}
          instanceInfo={instanceInfo}
          hasInstance
          instanceName={inbox.evolutionInstanceName}
        />
      )
    }

    // Se Meta Cloud nao esta habilitado para esta org, ir direto para Evolution
    if (!metaCloudEnabled) {
      return (
        <InboxConnectionCard
          inboxId={inbox.id}
          canManage={canManage}
          connectionStats={connectionStats}
          instanceInfo={instanceInfo}
          hasInstance={false}
          instanceName={null}
        />
      )
    }

    return (
      <ConnectionProviderSelector
        inboxId={inbox.id}
        canManage={canManage}
        connectionStats={connectionStats}
        instanceInfo={instanceInfo}
      />
    )
  }

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Back + Title */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/org/${orgSlug}/settings/inboxes`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{inbox.name}</h1>
            {inbox.evolutionInstanceName ||
            (inbox.connectionType === 'META_CLOUD' && inbox.metaPhoneNumberId) ? (
              <Badge
                variant="outline"
                className="h-6 gap-1.5 px-2 text-xs font-semibold bg-kronos-green/10 text-kronos-green border-kronos-green/20 hover:bg-kronos-green/20"
              >
                <CircleIcon className="h-1.5 w-1.5 fill-current" />
                Conectado
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-6 gap-1.5 px-2 text-xs font-semibold"
              >
                <CircleIcon className="h-1.5 w-1.5 fill-current" />
                Desconectado
              </Badge>
            )}
          </div>

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Canal</p>
                <p className="text-sm font-medium">
                  {channelLabels[inbox.channel] ?? inbox.channel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Agente IA</p>
                {canManage ? (
                  <Select
                    defaultValue={inbox.agentId ?? 'none'}
                    onValueChange={(value) => {
                      executeLinkAgent({
                        inboxId: inbox.id,
                        agentId: value === 'none' ? null : value,
                      })
                    }}
                    disabled={isLinking}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[120px] border-none bg-transparent p-0 text-sm font-medium shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {agentOptions.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">
                    {inbox.agentName ?? 'Nenhum'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Criada em</p>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Capture Card */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-4 w-4" />
            Captação de Leads
          </CardTitle>
          <CardDescription>
            Configure como novos contatos e negócios são criados a partir desta caixa de entrada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Auto Create Deal Toggle */}
          <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Criar negócio automaticamente</Label>
              <p className="text-xs text-muted-foreground">
                Cria um negócio para cada nova conversa iniciada nesta caixa.
              </p>
            </div>
            <Switch
              checked={inbox.autoCreateDeal}
              onCheckedChange={(checked) => {
                executeInlineUpdate({ id: inbox.id, autoCreateDeal: checked })
              }}
              disabled={!canManage}
            />
          </div>

          {/* Pipeline Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Pipeline de destino</Label>
            <Select
              value={inbox.pipelineId ?? 'auto'}
              onValueChange={(value) => {
                executeInlineUpdate({
                  id: inbox.id,
                  pipelineId: value === 'auto' ? null : value,
                })
              }}
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (primeiro pipeline)</SelectItem>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pipeline onde novos negócios serão criados.
            </p>
          </div>

          {/* Distribution Users Multi-select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Distribuição de leads</Label>
            {assignableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro disponível.</p>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    type="button"
                    disabled={!canManage}
                  >
                    {localDistributionUserIds.length === 0
                      ? 'Selecionar membros...'
                      : `${localDistributionUserIds.length} membro(s) selecionado(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    {assignableMembers.map((member) => (
                      <div key={member.userId} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dist-inbox-${member.userId}`}
                          checked={localDistributionUserIds.includes(member.userId!)}
                          onCheckedChange={() => handleToggleDistributionUser(member.userId!)}
                          disabled={!canManage}
                        />
                        <Label htmlFor={`dist-inbox-${member.userId}`} className="cursor-pointer">
                          {member.user?.fullName ?? member.email}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {localDistributionUserIds.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangleIcon className="h-4 w-4" />
                <span>Leads serão atribuídos ao dono da organização.</span>
              </div>
            )}

            {localDistributionUserIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localDistributionUserIds.map((userId) => {
                  const member = members.find((m) => m.userId === userId)
                  return member ? (
                    <Badge key={userId} variant="secondary">
                      {member.user?.fullName ?? member.email}
                    </Badge>
                  ) : null
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Leads serão distribuídos em round-robin entre os membros selecionados.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Card — roteado por provider */}
      {inbox.channel === 'WHATSAPP' && renderConnectionSection()}

      {/* Edit Sheet */}
      <Sheet
        open={isEditOpen}
        onOpenChange={(open) => setIsEditOpen(open)}
      >
        <UpsertInboxSheetContent
          key={inbox.id}
          defaultValues={{
            id: inbox.id,
            name: inbox.name,
            channel: inbox.channel as 'WHATSAPP' | 'WEB_CHAT',
            agentId: inbox.agentId,
          }}
          setIsOpen={setIsEditOpen}
          agentOptions={agentOptions}
          onUpdate={(data) => executeUpdate(data)}
          isUpdating={isUpdating}
        />
      </Sheet>
    </div>
  )
}

export default InboxDetailClient
