'use client'

import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'

interface CreateTaskConfigProps {
  title: string
  dueDaysOffset?: number
  onTitleChange: (value: string) => void
  onDueDaysOffsetChange: (value: number | undefined) => void
}

const CreateTaskConfig = ({
  title,
  dueDaysOffset,
  onTitleChange,
  onDueDaysOffsetChange,
}: CreateTaskConfigProps) => {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Título da tarefa *</Label>
        <Input
          placeholder="Ex: Follow-up com o lead"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Vencimento em dias (opcional)</Label>
        <Input
          type="number"
          min={1}
          placeholder="Ex: 3"
          value={dueDaysOffset ?? ''}
          onChange={(event) => {
            const val = event.target.value
            onDueDaysOffsetChange(val ? parseInt(val, 10) : undefined)
          }}
        />
      </div>
    </>
  )
}

export default CreateTaskConfig
