'use client'

import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import { Textarea } from '@/_components/ui/textarea'
import { Badge } from '@/_components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

type AllowedField = 'title' | 'value' | 'priority' | 'expectedCloseDate' | 'notes'
type AllowedStatus = 'WON' | 'LOST'
type FixedPriority = 'low' | 'medium' | 'high' | 'urgent'

const DEAL_FIELDS = [
  { id: 'title' as AllowedField, label: 'Título' },
  { id: 'value' as AllowedField, label: 'Valor (R$)' },
  { id: 'priority' as AllowedField, label: 'Prioridade' },
  { id: 'expectedCloseDate' as AllowedField, label: 'Previsão de fechamento' },
  { id: 'notes' as AllowedField, label: 'Notas' },
]

const DEAL_STATUSES = [
  { id: 'WON' as AllowedStatus, label: 'Pode marcar como Ganho (WON)' },
  { id: 'LOST' as AllowedStatus, label: 'Pode marcar como Perdido (LOST)' },
]

interface UpdateDealConfigProps {
  actionType: string
  allowedFields: AllowedField[]
  fixedPriority?: FixedPriority
  notesTemplate?: string
  allowedStatuses: AllowedStatus[]
  onAllowedFieldsChange: (fields: AllowedField[], extra?: Record<string, unknown>) => void
  onFixedPriorityChange: (value: string | undefined) => void
  onNotesTemplateChange: (value: string | undefined) => void
  onAllowedStatusesChange: (statuses: AllowedStatus[]) => void
}

const UpdateDealConfig = ({
  actionType,
  allowedFields,
  fixedPriority,
  notesTemplate,
  allowedStatuses,
  onAllowedFieldsChange,
  onFixedPriorityChange,
  onNotesTemplateChange,
  onAllowedStatusesChange,
}: UpdateDealConfigProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Campos que o agente pode atualizar</Label>
        <div className="grid grid-cols-2 gap-2">
          {DEAL_FIELDS.map((field) => {
            const isChecked = allowedFields.includes(field.id)
            return (
              <div key={field.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${actionType}-${field.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...allowedFields, field.id]
                      : allowedFields.filter((f) => f !== field.id)
                    const extra: Record<string, unknown> = {}
                    if (field.id === 'priority' && !checked) extra.fixedPriority = undefined
                    if (field.id === 'notes' && !checked) extra.notesTemplate = undefined
                    onAllowedFieldsChange(next, extra)
                  }}
                />
                <Label
                  htmlFor={`${actionType}-${field.id}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {field.label}
                </Label>
              </div>
            )
          })}
        </div>

        {allowedFields.includes('priority') && (
          <div className="space-y-1.5 pl-1">
            <Label className="text-xs text-muted-foreground">
              Prioridade fixa (opcional)
            </Label>
            <Select
              value={fixedPriority ?? ''}
              onValueChange={(val) => onFixedPriorityChange(val || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Deixar o agente decidir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {allowedFields.includes('notes') && (
          <div className="space-y-1.5 pl-1">
            <Label className="text-xs text-muted-foreground">
              Instruções para as notas (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Registre o decisor, orçamento disponível e prazo"
              value={notesTemplate ?? ''}
              onChange={(event) =>
                onNotesTemplateChange(event.target.value || undefined)
              }
              rows={2}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Status do negócio</Label>
          <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
            Ação irreversível
          </Badge>
        </div>
        <div className="space-y-2">
          {DEAL_STATUSES.map((status) => {
            const isChecked = allowedStatuses.includes(status.id)
            return (
              <div key={status.id} className="flex items-center gap-2">
                <Checkbox
                  id={`${actionType}-${status.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...allowedStatuses, status.id]
                      : allowedStatuses.filter((s) => s !== status.id)
                    onAllowedStatusesChange(next)
                  }}
                />
                <Label
                  htmlFor={`${actionType}-${status.id}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {status.label}
                </Label>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default UpdateDealConfig
