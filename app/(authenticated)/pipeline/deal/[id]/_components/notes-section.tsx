'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Check, X, FileText } from 'lucide-react'
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
      toast.success('Observações atualizadas!')
      setIsEditing(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar observações.')
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
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Observações
        </CardTitle>
        {!isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
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
              placeholder="Adicione observações sobre esta negociação..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="min-h-[120px] cursor-pointer rounded-md border bg-muted/30 p-4 text-sm transition-colors hover:bg-muted/50"
            onClick={() => setIsEditing(true)}
          >
            {deal.notes ? (
              <p className="whitespace-pre-wrap leading-relaxed">
                {deal.notes}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Clique para adicionar observações sobre esta negociação...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NotesSection
