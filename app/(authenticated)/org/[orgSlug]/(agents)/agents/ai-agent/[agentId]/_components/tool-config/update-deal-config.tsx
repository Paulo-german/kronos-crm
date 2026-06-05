'use client'

import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

type AllowedField = 'title' | 'value' | 'priority' | 'expectedCloseDate' | 'notes'
type FixedPriority = 'low' | 'medium' | 'high' | 'urgent'

const DEAL_FIELDS = [
  { id: 'title' as AllowedField, label: 'Título' },
  { id: 'value' as AllowedField, label: 'Valor (R$)' },
  { id: 'priority' as AllowedField, label: 'Prioridade' },
  { id: 'expectedCloseDate' as AllowedField, label: 'Previsão de fechamento' },
  { id: 'notes' as AllowedField, label: 'Notas' },
]

interface UpdateDealConfigProps {
  actionType: string
  allowedFields: AllowedField[]
  fixedPriority?: FixedPriority
  notesTemplate?: string
  onAllowedFieldsChange: (fields: AllowedField[], extra?: Record<string, unknown>) => void
  onFixedPriorityChange: (value: string | undefined) => void
  onNotesTemplateChange: (value: string | undefined) => void
}

const UpdateDealConfig = ({
  actionType,
  allowedFields,
  fixedPriority,
  notesTemplate,
  onAllowedFieldsChange,
  onFixedPriorityChange,
  onNotesTemplateChange,
}: UpdateDealConfigProps) => {
  return (
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
  )
}

export default UpdateDealConfig
