'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'
import { setWonLostStages } from '@/_actions/pipeline/set-won-lost-stages'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface WonLostSelectorsProps {
  pipelineId: string
  stages: StageDto[]
  wonStageId: string | null
  lostStageId: string | null
}

export function WonLostSelectors({
  pipelineId,
  stages,
  wonStageId: initialWonStageId,
  lostStageId: initialLostStageId,
}: WonLostSelectorsProps) {
  // Optimistic UI: estado local para atualização imediata
  const [wonStageId, setWonStageId] = useState(initialWonStageId)
  const [lostStageId, setLostStageId] = useState(initialLostStageId)

  const { execute, isPending } = useAction(setWonLostStages, {
    onSuccess: () => {
      toast.success('Configuração salva!')
    },
    onError: ({ error, input }) => {
      // Rollback em caso de erro
      setWonStageId(input.wonStageId ?? null)
      setLostStageId(input.lostStageId ?? null)
      toast.error(error.serverError || 'Erro ao salvar configuração.')
    },
  })

  const handleWonChange = (value: string) => {
    const newWonStageId = value === 'none' ? null : value
    // Optimistic update
    setWonStageId(newWonStageId)
    // Sincroniza com servidor
    execute({
      pipelineId,
      wonStageId: newWonStageId,
      lostStageId,
    })
  }

  const handleLostChange = (value: string) => {
    const newLostStageId = value === 'none' ? null : value
    // Optimistic update
    setLostStageId(newLostStageId)
    // Sincroniza com servidor
    execute({
      pipelineId,
      wonStageId,
      lostStageId: newLostStageId,
    })
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="font-medium">Etapas Especiais</h3>
      <p className="text-sm text-muted-foreground">
        Defina quais etapas representam negócios ganhos ou perdidos.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Etapa de Ganho</Label>
          <Select
            value={wonStageId || 'none'}
            onValueChange={handleWonChange}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {stages.map((stage) => (
                <SelectItem
                  key={stage.id}
                  value={stage.id}
                  disabled={stage.id === lostStageId}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color || '#6b7280' }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Etapa de Perda</Label>
          <Select
            value={lostStageId || 'none'}
            onValueChange={handleLostChange}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {stages.map((stage) => (
                <SelectItem
                  key={stage.id}
                  value={stage.id}
                  disabled={stage.id === wonStageId}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color || '#6b7280' }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
