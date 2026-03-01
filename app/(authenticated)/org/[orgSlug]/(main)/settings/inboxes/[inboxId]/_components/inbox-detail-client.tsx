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
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Sheet } from '@/_components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { InboxDetailDto } from '@/_data-access/inbox/get-inbox-by-id'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution/types-instance'
import type { MemberRole } from '@prisma/client'
import { updateInbox } from '@/_actions/inbox/update-inbox'
import { linkInboxToAgent } from '@/_actions/inbox/link-inbox-to-agent'
import UpsertInboxSheetContent from '../../_components/upsert-inbox-sheet-content'
import InboxConnectionCard from './inbox-connection-card'

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
}: InboxDetailClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'
  const [isEditOpen, setIsEditOpen] = useState(false)

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
            {inbox.evolutionInstanceName ? (
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

      {/* Connection Card */}
      {inbox.channel === 'WHATSAPP' && (
        <InboxConnectionCard
          inboxId={inbox.id}
          canManage={canManage}
          connectionStats={connectionStats}
          instanceInfo={instanceInfo}
          hasInstance={!!inbox.evolutionInstanceName}
          instanceName={inbox.evolutionInstanceName}
        />
      )}

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
