'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Pencil, Check, X, Calendar, User, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { updateDeal } from '@/_actions/deal/update-deal'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface TabSummaryProps {
  deal: DealDetailsDto
}

const priorityOptions = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

const TabSummary = ({ deal }: TabSummaryProps) => {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const { execute, isPending } = useAction(updateDeal, {
    onSuccess: () => {
      toast.success('Atualizado com sucesso!')
      setEditingField(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar.')
    },
  })

  const startEdit = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  const saveEdit = (field: string) => {
    execute({
      id: deal.id,
      [field]: editValue || null,
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Não definida'
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {/* Título */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground">
              Título
            </label>
            {editingField === 'title' ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => saveEdit('title')}
                  disabled={isPending}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">{deal.title}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startEdit('title', deal.title)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Grid de campos */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Contato */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" /> Contato
            </label>
            <p className="text-sm">{deal.contactName || 'Não vinculado'}</p>
          </div>

          {/* Empresa */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" /> Empresa
            </label>
            <p className="text-sm">{deal.companyName || 'Não vinculada'}</p>
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Prioridade
            </label>
            <Select
              value={deal.priority}
              onValueChange={(value) => {
                execute({
                  id: deal.id,
                  priority: value as 'low' | 'medium' | 'high' | 'urgent',
                })
              }}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Prevista */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" /> Previsão de Fechamento
            </label>
            <p className="text-sm">{formatDate(deal.expectedCloseDate)}</p>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-sm font-medium text-muted-foreground">
            Observações
          </label>
          {editingField === 'notes' ? (
            <div className="space-y-2">
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveEdit('notes')}
                  disabled={isPending}
                >
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[80px] cursor-pointer rounded-md border bg-muted/50 p-3 text-sm hover:bg-muted"
              onClick={() => startEdit('notes', deal.notes || '')}
            >
              {deal.notes || 'Clique para adicionar observações...'}
            </div>
          )}
        </div>

        {/* Metadados */}
        <div className="flex gap-4 border-t pt-4 text-xs text-muted-foreground">
          <span>Criado em: {formatDate(deal.createdAt)}</span>
          <span>Atualizado em: {formatDate(deal.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default TabSummary
