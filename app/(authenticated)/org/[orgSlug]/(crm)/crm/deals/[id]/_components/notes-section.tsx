'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { updateDeal } from '@/_actions/deal/update-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface NotesSectionProps {
  deal: DealDetailsDto
}

const NotesSection = ({ deal }: NotesSectionProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(deal.notes || '')

  const { execute, isPending } = useAction(updateDeal, {
    onSuccess: () => {
      toast.success('Anotações atualizadas!')
      setIsEditing(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar anotações.')
    },
  })

  const handleSave = () => {
    execute({
      id: deal.id,
      notes: content.trim() || null,
    })
  }

  const handleCancel = () => {
    setContent(deal.notes || '')
    setIsEditing(false)
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Anotações</CardTitle>
        {!isEditing && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={5} className="mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Adicione anotações sobre esta negociação..."
              rows={6}
              className="resize-none bg-background"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="default"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button size="default" onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-1 animate-spin" />
                ) : (
                  <Check size={5} className="mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="min-h-[120px] cursor-pointer rounded-md border bg-background p-4 text-sm transition-colors hover:bg-muted/30"
            onClick={() => setIsEditing(true)}
          >
            {deal.notes ? (
              <p className="whitespace-pre-wrap leading-relaxed">
                {deal.notes}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Clique para adicionar anotações sobre esta negociação...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotesSection
