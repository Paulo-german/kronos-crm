'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Form } from '@/_components/ui/form'
import { updateAgent } from '@/_actions/agent/update-agent'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'
import { DEFAULT_BUSINESS_HOURS_CONFIG } from './constants'
import { BasicSettingsSection } from './general-tab/basic-settings-section'
import { ModelBehaviorSection } from './general-tab/model-behavior-section'
import { PipelinesSection } from './general-tab/pipelines-section'
import { ToolsSection } from './general-tab/tools-section'
import { BusinessHoursSection } from './general-tab/business-hours-section'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

export const generalTabSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio'),
  systemPrompt: z.string().min(1, 'Prompt não pode ser vazio'),
  isActive: z.boolean(),
  modelId: z.string(),
  debounceSeconds: z.number().int().min(0).max(30),
  pipelineIds: z.array(z.string().uuid()),
  toolsEnabled: z.array(z.string()),
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
}

const GeneralTab = ({ agent, pipelines, canManage }: GeneralTabProps) => {
  const form = useForm<GeneralTabFormValues>({
    resolver: zodResolver(generalTabSchema),
    defaultValues: {
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      isActive: agent.isActive,
      modelId: agent.modelId,
      debounceSeconds: agent.debounceSeconds,
      pipelineIds: agent.pipelineIds,
      toolsEnabled: agent.toolsEnabled,
      businessHoursEnabled: agent.businessHoursEnabled,
      businessHoursTimezone: agent.businessHoursTimezone,
      businessHoursConfig: agent.businessHoursConfig ?? DEFAULT_BUSINESS_HOURS_CONFIG,
      outOfHoursMessage: agent.outOfHoursMessage,
    },
  })

  const { execute, isPending } = useAction(updateAgent, {
    onSuccess: () => {
      toast.success('Agente atualizado com sucesso!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar agente.')
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
        <BasicSettingsSection form={form} canManage={canManage} />
        <ModelBehaviorSection form={form} canManage={canManage} />
        <PipelinesSection form={form} canManage={canManage} pipelines={pipelines} />
        <ToolsSection form={form} canManage={canManage} />
        <BusinessHoursSection form={form} canManage={canManage} />

        {canManage && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Salvando...
                </div>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}

export default GeneralTab
