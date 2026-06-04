import { useState } from 'react'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { X } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Label } from '@/_components/ui/label'
import type { SectionProps } from './types'

export const RulesSection = ({ form, canManage }: SectionProps) => {
  const [newGuideline, setNewGuideline] = useState('')
  const [newRestriction, setNewRestriction] = useState('')

  const guidelines = form.watch('promptConfig.guidelines')
  const restrictions = form.watch('promptConfig.restrictions')

  const addGuideline = () => {
    const value = newGuideline.trim()
    if (!value) return
    const current = form.getValues('promptConfig.guidelines')
    form.setValue('promptConfig.guidelines', [...current, value], { shouldDirty: true })
    setNewGuideline('')
  }

  const removeGuideline = (index: number) => {
    const current = form.getValues('promptConfig.guidelines')
    form.setValue(
      'promptConfig.guidelines',
      current.filter((_, idx) => idx !== index),
      { shouldDirty: true },
    )
  }

  const addRestriction = () => {
    const value = newRestriction.trim()
    if (!value) return
    const current = form.getValues('promptConfig.restrictions')
    form.setValue('promptConfig.restrictions', [...current, value], { shouldDirty: true })
    setNewRestriction('')
  }

  const removeRestriction = (index: number) => {
    const current = form.getValues('promptConfig.restrictions')
    form.setValue(
      'promptConfig.restrictions',
      current.filter((_, idx) => idx !== index),
      { shouldDirty: true },
    )
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Regras de Atendimento</CardTitle>
        <CardDescription>
          Diretrizes e restrições para o comportamento do agente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Diretrizes</Label>
          <p className="text-xs text-muted-foreground">
            Instruções que o agente deve seguir durante as conversas.
          </p>
          {canManage && (
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Sempre pergunte o nome do cliente"
                value={newGuideline}
                onChange={(event) => setNewGuideline(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addGuideline()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGuideline}
                disabled={!newGuideline.trim()}
              >
                Adicionar
              </Button>
            </div>
          )}
          {guidelines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guidelines.map((guideline, index) => (
                <Badge key={index} variant="secondary" className="gap-1 py-1">
                  {guideline}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removeGuideline(index)}
                      className="ml-1 rounded-full hover:bg-foreground/10"
                      aria-label={`Remover diretriz: ${guideline}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label>Restrições</Label>
          <p className="text-xs text-muted-foreground">
            Comportamentos que o agente nunca deve ter.
          </p>
          {canManage && (
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Nunca forneça preços sem aprovação"
                value={newRestriction}
                onChange={(event) => setNewRestriction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addRestriction()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRestriction}
                disabled={!newRestriction.trim()}
              >
                Adicionar
              </Button>
            </div>
          )}
          {restrictions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {restrictions.map((restriction, index) => (
                <Badge key={index} variant="destructive" className="gap-1 py-1">
                  {restriction}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removeRestriction(index)}
                      className="ml-1 rounded-full hover:bg-foreground/10"
                      aria-label={`Remover restrição: ${restriction}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
