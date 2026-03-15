'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Brain } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Form } from '@/_components/ui/form'
import { cn } from '@/_lib/utils'
import { updateAgent } from '@/_actions/agent/update-agent'
import { useTrainingProgress } from '../_hooks/use-training-progress'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import { DEFAULT_BUSINESS_HOURS_CONFIG, DEFAULT_PROMPT_CONFIG } from './constants'
import { IdentitySection } from './general-tab/identity-section'
import { CompanySection } from './general-tab/company-section'
import { CommunicationSection } from './general-tab/communication-section'
import { RulesSection } from './general-tab/rules-section'
import { ModelBehaviorSection } from './general-tab/model-behavior-section'
import { PipelinesSection } from './general-tab/pipelines-section'
import { BusinessHoursSection } from './general-tab/business-hours-section'
import { AdvancedSection } from './general-tab/advanced-section'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

export const generalTabSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio'),
  promptConfig: promptConfigSchema,
  systemPrompt: z.string(),
  isActive: z.boolean(),
  modelId: z.string(),
  debounceSeconds: z.number().int().min(0).max(30),
  pipelineIds: z.array(z.string().uuid()),
  businessHoursEnabled: z.boolean(),
  businessHoursTimezone: z.string(),
  businessHoursConfig: businessHoursConfigSchema,
  outOfHoursMessage: z.string().nullable(),
})

export type GeneralTabFormValues = z.infer<typeof generalTabSchema>

interface GeneralTabProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  canManage: boolean
  onSaveSuccess?: () => void
}

const GeneralTab = ({ agent, pipelines, canManage, onSaveSuccess }: GeneralTabProps) => {
  const form = useForm<GeneralTabFormValues>({
    resolver: zodResolver(generalTabSchema),
    defaultValues: {
      name: agent.name,
      promptConfig: agent.promptConfig ?? DEFAULT_PROMPT_CONFIG,
      systemPrompt: agent.systemPrompt,
      isActive: agent.isActive,
      modelId: agent.modelId,
      debounceSeconds: agent.debounceSeconds,
      pipelineIds: agent.pipelineIds,
      businessHoursEnabled: agent.businessHoursEnabled,
      businessHoursTimezone: agent.businessHoursTimezone,
      businessHoursConfig: agent.businessHoursConfig ?? DEFAULT_BUSINESS_HOURS_CONFIG,
      outOfHoursMessage: agent.outOfHoursMessage,
    },
  })

  const { progress, visible, isError, start, complete, fail } = useTrainingProgress()

  const { execute, isPending } = useAction(updateAgent, {
    onExecute: () => start(),
    onSuccess: () => {
      toast.success('Agente treinado e pronto para operar!')
      form.reset(form.getValues())
      complete()
      // Notifica o painel de chat para auto-reset (configuração foi alterada)
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Falha ao treinar o agente. Tente novamente.')
      fail()
    },
  })

  const onSubmit = (data: GeneralTabFormValues) => {
    execute({
      id: agent.id,
      ...data,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <IdentitySection form={form} canManage={canManage} />
        <CompanySection form={form} canManage={canManage} />
        <CommunicationSection form={form} canManage={canManage} />
        <RulesSection form={form} canManage={canManage} />
        <ModelBehaviorSection form={form} canManage={canManage} />
        <PipelinesSection form={form} canManage={canManage} pipelines={pipelines} />
        <BusinessHoursSection form={form} canManage={canManage} />
        <AdvancedSection form={form} canManage={canManage} />

        {canManage && (
          <div className="relative flex justify-end overflow-hidden">
            {visible && (
              <div
                className="absolute inset-x-0 top-0 h-0.5 transition-all ease-out"
                style={{
                  width: `${progress}%`,
                  transitionDuration: progress < 100 ? '1200ms' : '300ms',
                  background: isError
                    ? 'hsl(var(--destructive))'
                    : 'linear-gradient(90deg, var(--kronos-purple), var(--kronos-cyan), var(--kronos-green))',
                }}
              />
            )}
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
            >
              <Brain className={cn('mr-2 h-4 w-4', isPending && 'animate-pulse')} />
              {isPending ? 'Treinando...' : 'Treinar Agente'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

export default GeneralTab
