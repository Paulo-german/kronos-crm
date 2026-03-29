'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Separator } from '@/_components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  EditIcon,
  TrashIcon,
  CopyIcon,
  ZapIcon,
  FilterIcon,
  PlayCircleIcon,
  ActivityIcon,
} from 'lucide-react'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { AutomationWizardSheet } from '../../_components/automation-wizard-sheet'
import { ExecutionHistory } from './execution-history'
import { TRIGGER_LABELS, ACTION_LABELS, CONDITION_FIELD_LABELS, CONDITION_OPERATOR_LABELS } from '../../_components/automation-labels'
import { toggleAutomation } from '@/_actions/automation/toggle-automation'
import { deleteAutomation } from '@/_actions/automation/delete-automation'
import { updateAutomation } from '@/_actions/automation/update-automation'
import type { AutomationDetailDto } from '@/_data-access/automation/get-automation-by-id'
import type { UpdateAutomationInput } from '@/_actions/automation/update-automation/schema'
import type { AutomationCondition } from '@/_actions/automation/create-automation/schema'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'
import type { AutomationWizardEditData } from '../../_components/wizard-form-types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

interface AutomationDetailClientProps {
  automation: AutomationDetailDto
  orgSlug: string
  pipelines: OrgPipelineDto[]
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
}

export function AutomationDetailClient({
  automation,
  orgSlug,
  pipelines,
  stageOptions,
  members,
  lossReasons,
}: AutomationDetailClientProps) {
  const router = useRouter()
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isDuplicateSheetOpen, setIsDuplicateSheetOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { execute: executeToggle } = useAction(toggleAutomation, {
    onSuccess: ({ input }) => {
      toast.success(input.isActive ? 'Automação ativada.' : 'Automação desativada.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao alterar status da automação.')
    },
  })

  const { execute: executeDelete, isExecuting: isDeletingIndividual } = useAction(deleteAutomation, {
    onSuccess: () => {
      toast.success('Automação excluída com sucesso.')
      router.push(`/org/${orgSlug}/settings/automations`)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir automação.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateAutomation, {
    onSuccess: () => {
      toast.success('Automação atualizada com sucesso!')
      setIsEditSheetOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar automação.')
    },
  })

  const handleUpdate = (data: UpdateAutomationInput) => {
    executeUpdate(data)
  }

  // Dados completos para edição via wizard (inclui triggerConfig, actionConfig e conditions)
  const automationForWizard: AutomationWizardEditData = {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    isActive: automation.isActive,
    triggerType: automation.triggerType,
    triggerConfig: automation.triggerConfig,
    conditions: automation.conditions,
    actionType: automation.actionType,
    actionConfig: automation.actionConfig,
  }

  // Dados para duplicação — id vazio indica criação, nome com sufixo (cópia)
  const automationForDuplicate: AutomationWizardEditData = {
    ...automationForWizard,
    id: '',
    name: `${automation.name} (cópia)`,
  }

  const conditions = automation.conditions as AutomationCondition[]

  return (
    <>
      {/* Sheet de edição */}
      <AutomationWizardSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members}
        lossReasons={lossReasons}
        editingAutomation={automationForWizard}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />

      {/* Sheet de duplicação — id vazio faz o wizard usar createAutomation internamente */}
      <AutomationWizardSheet
        open={isDuplicateSheetOpen}
        onOpenChange={setIsDuplicateSheetOpen}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members}
        lossReasons={lossReasons}
        editingAutomation={automationForDuplicate}
      />

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir automação?"
        description={
          <p>
            Esta ação não pode ser desfeita. A automação{' '}
            <span className="font-bold text-foreground">{automation.name}</span>{' '}
            e todo o histórico de execuções serão removidos permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeDelete({ id: automation.id })}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal: resumo da automação */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card de status e ações */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl">{automation.name}</CardTitle>
                  {automation.description && (
                    <CardDescription className="mt-1">
                      {automation.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {automation.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                  <Switch
                    checked={automation.isActive}
                    onCheckedChange={(checked) =>
                      executeToggle({ id: automation.id, isActive: checked })
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditSheetOpen(true)}
                >
                  <EditIcon className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDuplicateSheetOpen(true)}
                >
                  <CopyIcon className="mr-2 h-4 w-4" />
                  Duplicar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de configuração visual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gatilho */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ZapIcon className="h-4 w-4 text-primary" />
                  <span>Gatilho</span>
                </div>
                <div className="ml-6">
                  <Badge variant="secondary">
                    {TRIGGER_LABELS[automation.triggerType]}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Condições */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FilterIcon className="h-4 w-4 text-amber-500" />
                  <span>Condições</span>
                </div>
                <div className="ml-6">
                  {conditions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma condição — aplica a todas as negociações
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {conditions.map((condition, index) => (
                        <div key={index} className="space-y-1">
                          {index > 0 && (
                            <span className="text-xs font-medium text-muted-foreground">E</span>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {CONDITION_FIELD_LABELS[condition.field] ?? condition.field}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {CONDITION_OPERATOR_LABELS[condition.operator] ?? condition.operator}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {Array.isArray(condition.value)
                                ? condition.value.join(', ')
                                : String(condition.value)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Ação */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <PlayCircleIcon className="h-4 w-4 text-emerald-500" />
                  <span>Ação</span>
                </div>
                <div className="ml-6">
                  <Badge variant="outline">
                    {ACTION_LABELS[automation.actionType]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold tabular-nums">
                  {automation.executionCount.toLocaleString('pt-BR')}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Execuções totais</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {automation.executions.filter((execution) => execution.status === 'SUCCESS').length}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Bem-sucedidas (últimas 20)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {automation.lastTriggeredAt
                    ? formatDistanceToNow(new Date(automation.lastTriggeredAt), {
                        addSuffix: false,
                        locale: ptBR,
                      })
                    : '—'}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Última execução</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Coluna lateral: histórico de execuções */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Histórico de execuções</h2>
          </div>
          <ExecutionHistory
            executions={automation.executions}
            orgSlug={orgSlug}
          />
        </div>
      </div>
    </>
  )
}
