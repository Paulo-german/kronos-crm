'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Inbox,
  Wifi,
  WifiOff,
  ExternalLink,
  Plus,
  Link2,
  Loader2,
  Unlink,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { linkInboxToAgent } from '@/_actions/inbox/link-inbox-to-agent'
import { createInbox } from '@/_actions/inbox/create-inbox'
import type { AgentDetailDto, AgentInboxDto } from '@/_data-access/agent/get-agent-by-id'

interface InboxOptionDto {
  id: string
  name: string
  channel: string
  agentId: string | null
}

interface ConnectionTabProps {
  agent: AgentDetailDto
  canManage: boolean
  availableInboxes: InboxOptionDto[]
}

const createInlineInboxSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
})

type CreateInlineInboxInput = z.infer<typeof createInlineInboxSchema>

const ConnectionTab = ({ agent, canManage, availableInboxes }: ConnectionTabProps) => {
  const params = useParams()
  const orgSlug = params?.orgSlug as string
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedInboxId, setSelectedInboxId] = useState<string>('')

  const { execute: executeLink, isPending: isLinking } = useAction(
    linkInboxToAgent,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada vinculada!')
        setShowLinkForm(false)
        setSelectedInboxId('')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao vincular.')
      },
    },
  )

  const { execute: executeUnlink, isPending: isUnlinking } = useAction(
    linkInboxToAgent,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada desvinculada!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao desvincular.')
      },
    },
  )

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createInbox,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada criada e vinculada!')
        setShowCreateForm(false)
        form.reset()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar caixa de entrada.')
      },
    },
  )

  const form = useForm<CreateInlineInboxInput>({
    resolver: zodResolver(createInlineInboxSchema),
    defaultValues: { name: '' },
  })

  const handleLinkExisting = () => {
    if (!selectedInboxId) return
    executeLink({ inboxId: selectedInboxId, agentId: agent.id })
  }

  const handleUnlink = (inboxId: string) => {
    executeUnlink({ inboxId, agentId: null })
  }

  const handleCreateInline = (data: CreateInlineInboxInput) => {
    executeCreate({
      name: data.name,
      channel: 'WHATSAPP',
      agentId: agent.id,
    })
  }

  // Inboxes sem agent (disponíveis para vincular)
  const unlinkedInboxes = availableInboxes.filter(
    (inbox) => !inbox.agentId,
  )

  const hasInboxes = agent.inboxes.length > 0

  return (
    <div className="space-y-4">
      {/* Lista de inboxes vinculadas */}
      {hasInboxes ? (
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Inbox className="h-5 w-5" />
              Caixas de Entrada Vinculadas
            </CardTitle>
            <CardDescription>
              Gerencie as caixas de entrada conectadas a este agente. A conexão
              WhatsApp é feita na página de cada caixa de entrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agent.inboxes.map((inbox) => (
              <InboxRow
                key={inbox.id}
                inbox={inbox}
                orgSlug={orgSlug}
                canManage={canManage}
                onUnlink={() => handleUnlink(inbox.id)}
                isUnlinking={isUnlinking}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Inbox className="h-5 w-5" />
              Nenhuma Caixa de Entrada
            </CardTitle>
            <CardDescription>
              Este agente não possui caixas de entrada vinculadas. Vincule uma
              existente ou crie uma nova para que o agente possa receber
              mensagens.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Ações de vincular/criar */}
      {canManage && (
        <div className="space-y-4">
          {/* Vincular existente */}
          {!showLinkForm && !showCreateForm && (
            <div className="flex gap-3">
              {unlinkedInboxes.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowLinkForm(true)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Vincular Inbox Existente
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Nova Inbox
              </Button>
            </div>
          )}

          {/* Form vincular existente */}
          {showLinkForm && (
            <Card className="border-border/50 bg-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Vincular Caixa de Entrada Existente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedInboxId}
                      onValueChange={setSelectedInboxId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma caixa de entrada" />
                      </SelectTrigger>
                      <SelectContent>
                        {unlinkedInboxes.map((inbox) => (
                          <SelectItem key={inbox.id} value={inbox.id}>
                            {inbox.name} ({inbox.channel === 'WHATSAPP' ? 'WhatsApp' : 'Web Chat'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleLinkExisting}
                    disabled={!selectedInboxId || isLinking}
                  >
                    {isLinking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Vincular
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowLinkForm(false)
                      setSelectedInboxId('')
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form criar nova */}
          {showCreateForm && (
            <Card className="border-border/50 bg-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Criar Nova Caixa de Entrada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCreateInline)}
                    className="flex items-end gap-3"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: WhatsApp Vendas"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Criar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowCreateForm(false)
                        form.reset()
                      }}
                    >
                      Cancelar
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Componente para cada linha de inbox vinculada
interface InboxRowProps {
  inbox: AgentInboxDto
  orgSlug: string
  canManage: boolean
  onUnlink: () => void
  isUnlinking: boolean
}

const InboxRow = ({
  inbox,
  orgSlug,
  canManage,
  onUnlink,
  isUnlinking,
}: InboxRowProps) => {
  const isConnected = !!inbox.evolutionInstanceName

  return (
    <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-3">
      <div className="flex items-center gap-3">
        {isConnected ? (
          <Badge
            variant="outline"
            className="gap-1.5 bg-kronos-green/10 text-kronos-green border-kronos-green/20"
          >
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        )}
        <span className="text-sm font-medium">{inbox.name}</span>
        <Badge variant="secondary" className="text-xs">
          {inbox.channel === 'WHATSAPP' ? 'WhatsApp' : 'Web Chat'}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/inboxes/${inbox.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Gerenciar
          </Link>
        </Button>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnlink}
            disabled={isUnlinking}
            className="text-muted-foreground hover:text-destructive"
          >
            {isUnlinking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default ConnectionTab
