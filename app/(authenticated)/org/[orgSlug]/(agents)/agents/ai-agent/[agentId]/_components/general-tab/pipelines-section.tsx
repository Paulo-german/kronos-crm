import { AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Badge } from '@/_components/ui/badge'
import { Label } from '@/_components/ui/label'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { SectionProps } from './types'

interface PipelinesSectionProps extends SectionProps {
  pipelines: OrgPipelineDto[]
}

export const PipelinesSection = ({ form, canManage, pipelines }: PipelinesSectionProps) => {
  const watchPipelineIds = form.watch('pipelineIds')

  const handleTogglePipeline = (pipelineId: string) => {
    const current = form.getValues('pipelineIds')
    const updated = current.includes(pipelineId)
      ? current.filter((id) => id !== pipelineId)
      : [...current, pipelineId]
    form.setValue('pipelineIds', updated, { shouldDirty: true })
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Pipelines que este agente pode gerenciar
        </CardTitle>
        <CardDescription>
          Controla quais pipelines o agente pode consultar e mover negócios via
          ferramentas. Não define onde novos negócios são criados — isso é
          configurado em cada caixa de entrada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pipelines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum pipeline disponível.
          </p>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start" type="button">
                {watchPipelineIds.length === 0
                  ? 'Selecionar pipelines...'
                  : `${watchPipelineIds.length} pipeline(s) selecionado(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`pipeline-${pipeline.id}`}
                      checked={watchPipelineIds.includes(pipeline.id)}
                      onCheckedChange={() => handleTogglePipeline(pipeline.id)}
                      disabled={!canManage}
                    />
                    <Label
                      htmlFor={`pipeline-${pipeline.id}`}
                      className="cursor-pointer"
                    >
                      {pipeline.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {watchPipelineIds.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <AlertTriangleIcon className="h-4 w-4" />
            <span>
              Sem pipelines vinculados, o agente não conseguirá mover negócios
              entre etapas.
            </span>
          </div>
        )}

        {watchPipelineIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {watchPipelineIds.map((pipelineId) => {
              const pipeline = pipelines.find(
                (item) => item.id === pipelineId,
              )
              return pipeline ? (
                <Badge key={pipelineId} variant="secondary">
                  {pipeline.name}
                </Badge>
              ) : null
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
