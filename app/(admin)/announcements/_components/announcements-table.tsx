'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, Globe, Building2 } from 'lucide-react'
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
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { deleteAnnouncement } from '@/_actions/announcement/delete-announcement'
import type { AnnouncementDto } from '@/_data-access/announcement/types'

interface AnnouncementsTableProps {
  announcements: AnnouncementDto[]
}

export const AnnouncementsTable = ({ announcements }: AnnouncementsTableProps) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { execute: executeDelete, status: deleteStatus } = useAction(deleteAnnouncement, {
    onSuccess: () => {
      toast.success('Comunicado excluído com sucesso.')
      setPendingDeleteId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir comunicado.')
      setPendingDeleteId(null)
    },
  })

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return
    executeDelete({ announcementId: pendingDeleteId })
  }

  return (
    <>
      <div className="rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Título</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead className="text-right">Destinatários</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{announcement.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {announcement.body}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {announcement.targetOrgIds.length === 0 ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Globe className="h-3 w-3" />
                      Todas as orgs
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5">
                      <Building2 className="h-3 w-3" />
                      {announcement.targetOrgIds.length}{' '}
                      {announcement.targetOrgIds.length === 1 ? 'org' : 'orgs'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {announcement.totalRecipients.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {format(new Date(announcement.createdAt), "d 'de' MMM, yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDeleteId(announcement.id)}
                    disabled={deleteStatus === 'executing'}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir comunicado</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* AlertDialog de confirmação de deleção */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro do comunicado será removido, mas as
              notificações já entregues aos usuários permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStatus === 'executing'}>Cancelar</AlertDialogCancel>
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
