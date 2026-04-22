'use client'

import { useState } from 'react'
import { TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { DealsToolbar } from './deals-toolbar'
import { DealsDataTable } from './deals-data-table'
import { DealsPagination } from './deals-pagination'
import { DealsEmptyState } from './deals-empty-state'
import { DealDialogContent } from '../../_components/deal-dialog-content'
import { useDealListFilters } from '../_lib/use-deal-list-filters'
import { updateDeal } from '@/_actions/deal/update-deal'
import { deleteDeal } from '@/_actions/deal/delete-deal'
import { bulkDeleteDeals } from '@/_actions/deal/bulk-delete-deals'
import type { DealListDto } from '@/_data-access/deal/get-deals'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto, PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { MemberRole } from '@prisma/client'

interface DealsListClientProps {
  deals: DealListDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stages: StageDto[]
  contacts: ContactDto[]
  pipeline: PipelineWithStagesDto
  pipelines: OrgPipelineDto[]
  activePipelineId: string
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  withinQuota: boolean
  orgSlug: string
  isTutorialCompleted: boolean
}

export function DealsListClient({
  deals,
  total,
  page,
  pageSize,
  totalPages,
  stages,
  contacts,
  pipeline,
  pipelines,
  activePipelineId,
  members,
  currentUserId,
  userRole,
  withinQuota,
  orgSlug,
  isTutorialCompleted,
}: DealsListClientProps) {
  const {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    sort,
    setSort,
    assignedTo,
    setAssignedTo,
    search,
    setSearch,
    setPage,
    setPageSize,
    pipelineId,
    setPipelineId,
  } = useDealListFilters()

  // Estado elevado do Sheet de edição — sobrevive a re-renders
  const [editingDeal, setEditingDeal] = useState<DealListDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado elevado do Dialog de deleção individual
  const [deletingDeal, setDeletingDeal] = useState<DealListDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado elevado do Dialog de deleção em massa
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  // 3 hooks de action no orquestrador
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Negociação atualizada com sucesso!')
        setIsEditSheetOpen(false)
        setEditingDeal(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar negociação.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeletingIndividual } = useAction(
    deleteDeal,
    {
      onSuccess: () => {
        toast.success('Negociação excluída com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingDeal(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao excluir negociação.')
      },
    },
  )

  const { execute: executeBulkDelete, isPending: isBulkDeleting } = useAction(
    bulkDeleteDeals,
    {
      onSuccess: ({ data }) => {
        toast.success(
          `${data?.count ?? bulkDeleteIds.length} negociação(ões) excluída(s) com sucesso.`,
        )
        setIsBulkDeleteDialogOpen(false)
        setBulkDeleteIds([])
      },
      onError: () => {
        toast.error('Erro ao excluir negociações.')
      },
    },
  )

  const handleEdit = (deal: DealListDto) => {
    setEditingDeal(deal)
    setIsEditSheetOpen(true)
  }

  const handleDelete = (deal: DealListDto) => {
    setDeletingDeal(deal)
    setIsDeleteDialogOpen(true)
  }

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids)
    setIsBulkDeleteDialogOpen(true)
  }

  // Verifica se há qualquer filtro URL ativo para distinguir "lista vazia" de "sem resultados"
  // pipelineId incluído: funil sem deals não deve cair no empty state de "crie seu primeiro deal"
  const hasAnyUrlFilter = hasActiveFilters || !!search || !!assignedTo || !!pipelineId

  // Empty state premium: total zero E sem nenhum filtro ativo
  const showEmptyState = total === 0 && !hasAnyUrlFilter

  if (showEmptyState) {
    return (
      <DealsEmptyState
        stages={stages}
        contacts={contacts}
        withinQuota={withinQuota}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <DealsToolbar
          members={members}
          contacts={contacts}
          stages={stages}
          pipeline={pipeline}
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          onPipelineChange={setPipelineId}
          pipelineId={pipelineId}
          currentUserId={currentUserId}
          userRole={userRole}
          withinQuota={withinQuota}
          filters={filters}
          onApplyFilters={setFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          sort={sort}
          onSortChange={setSort}
          assignedTo={assignedTo}
          onAssignedToChange={setAssignedTo}
          search={search}
          onSearchChange={setSearch}
          isTutorialCompleted={isTutorialCompleted}
        />

        <DealsDataTable
          deals={deals}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          orgSlug={orgSlug}
        />

        <DealsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Sheet de edição — estado elevado para sobreviver a re-renders */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingDeal(null)
        }}
      >
        {editingDeal && (
          <DealDialogContent
            key={editingDeal.id}
            defaultValues={{
              id: editingDeal.id,
              title: editingDeal.title,
              stageId: editingDeal.stageId,
              contactId: editingDeal.contactId ?? undefined,
              companyId: editingDeal.companyId ?? undefined,
              expectedCloseDate: editingDeal.expectedCloseDate
                ? new Date(editingDeal.expectedCloseDate)
                : undefined,
            }}
            stages={stages}
            contacts={contacts}
            setIsOpen={setIsEditSheetOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de deleção individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingDeal(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente a negociação{' '}
            <span className="font-bold text-foreground">
              {deletingDeal?.title}
            </span>
            .
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingDeal) executeDelete({ id: deletingDeal.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Excluir negociações selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length}{' '}
              {bulkDeleteIds.length === 1 ? 'negociação' : 'negociações'}{' '}
              permanentemente do sistema.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isBulkDeleting}
        confirmLabel="Confirmar Exclusão"
      />
    </>
  )
}
