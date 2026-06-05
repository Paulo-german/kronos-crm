'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, BarChart3Icon, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { updateAgentGroup } from '@/_actions/agent-group/update-agent-group'
import {
  updateAgentGroupSchema,
  type UpdateAgentGroupInput,
} from '@/_actions/agent-group/update-agent-group/schema'
import { GroupActiveSwitch } from './group-active-switch'
import { RouterConfigCard } from './router-config-card'
import { MembersCard } from './members-card'
import { LinkedInboxesCard } from './linked-inboxes-card'
import type { AgentGroupDetailDto } from '@/_data-access/agent-group/get-agent-group-by-id'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import type { InboxListDto } from '@/_data-access/inbox/get-inboxes'

interface GroupDetailClientProps {
  group: AgentGroupDetailDto
  allOrgAgents: AgentDto[]
  allOrgInboxes: InboxListDto[]
  orgSlug: string
}

export function GroupDetailClient({
  group,
  allOrgAgents,
  allOrgInboxes,
  orgSlug,
}: GroupDetailClientProps) {
  const availableInboxes = allOrgInboxes.filter(
    (inbox) => !inbox.agentId && (!inbox.agentGroupId || inbox.agentGroupId === group.id),
  )

  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="w-fit" asChild>
              <Link href={`/org/${orgSlug}/agents/ai-agent/groups`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/org/${orgSlug}/agents/ai-agent/groups/${group.id}/executions`}>
                <BarChart3Icon className="h-3.5 w-3.5" />
                Execuções
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {group.name}
              </h1>
              <GroupActiveSwitch
                groupId={group.id}
                defaultActive={group.isActive}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{group.memberCount} workers</span>
              <span>{group.inboxCount} inboxes</span>
            </div>
          </div>

          {group.description && (
            <p className="text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ConfigCard group={group} />
          <RouterConfigCard group={group} />
          <MembersCard group={group} allOrgAgents={allOrgAgents} />
          <LinkedInboxesCard
            groupId={group.id}
            inboxes={group.inboxes}
            availableInboxes={availableInboxes}
            orgSlug={orgSlug}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Subcomponente: Card de configuração básica
// ─────────────────────────────────────────────────────────

interface ConfigCardProps {
  group: AgentGroupDetailDto
}

function ConfigCard({ group }: ConfigCardProps) {
  const form = useForm<UpdateAgentGroupInput>({
    resolver: zodResolver(updateAgentGroupSchema),
    defaultValues: {
      groupId: group.id,
      name: group.name,
      description: group.description ?? '',
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateAgentGroup,
    {
      onSuccess: () => {
        toast.success('Configuração salva.')
        form.reset(form.getValues())
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao salvar configuração.')
      },
    },
  )

  const onSubmit = (data: UpdateAgentGroupInput) => {
    executeUpdate(data)
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-base">Configuração</CardTitle>
        <CardDescription>Nome e descrição da equipe.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da equipe</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
