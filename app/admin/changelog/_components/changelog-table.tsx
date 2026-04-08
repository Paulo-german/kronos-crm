'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'

import { deleteChangelogEntry } from '@/_actions/changelog/delete-changelog-entry'
import { toggleChangelogPublish } from '@/_actions/changelog/toggle-changelog-publish'
import type { ChangelogEntryAdminDto } from '@/_data-access/changelog/types'
import type { ChangelogEntryType } from '@prisma/client'

interface ChangelogTableProps {
  entries: ChangelogEntryAdminDto[]
}

const TYPE_LABELS: Record<ChangelogEntryType, string> = {
  NEW: 'Novidade',
  IMPROVEMENT: 'Melhoria',
  FIX: 'Correção',
}

const TYPE_CLASSES: Record<ChangelogEntryType, string> = {
  NEW: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  IMPROVEMENT: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  FIX: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
}

export const ChangelogTable = ({ entries }: ChangelogTableProps) => {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const { execute: executeDelete, status: deleteStatus } = useAction(deleteChangelogEntry, {
    onSuccess: () => {
      toast.success('Entrada excluída com sucesso.')
      setPendingDeleteId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir entrada.')
      setPendingDeleteId(null)
    },
  })

  const { execute: executeToggle } = useAction(toggleChangelogPublish, {
    onSuccess: ({ input }) => {
      toast.success(input.isPublished ? 'Entrada publicada.' : 'Entrada despublicada.')
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(input.entryId)
        return next
      })
    },
    onError: ({ error, input }) => {
      toast.error(error.serverError ?? 'Erro ao alterar publicação.')
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(input?.entryId ?? '')
        return next
      })
    },
  })

  const handleToggle = (entryId: string, currentValue: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(entryId))
    executeToggle({ entryId, isPublished: !currentValue })
  }

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    executeDelete({ entryId: pendingDeleteId })
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Título</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[160px]">Data</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{entry.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={TYPE_CLASSES[entry.type]}
                  >
                    {TYPE_LABELS[entry.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={entry.isPublished}
                    disabled={togglingIds.has(entry.id)}
                    onCheckedChange={() => handleToggle(entry.id, entry.isPublished)}
                    aria-label={entry.isPublished ? 'Despublicar entrada' : 'Publicar entrada'}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {entry.publishedAt
                    ? format(new Date(entry.publishedAt), "d 'de' MMM, yyyy", { locale: ptBR })
                    : 'Rascunho'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/changelog/${entry.id}`)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPendingDeleteId(entry.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrada do changelog?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A entrada será removida permanentemente e não
              aparecerá mais para os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatus === 'executing'}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteStatus === 'executing'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStatus === 'executing' ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
