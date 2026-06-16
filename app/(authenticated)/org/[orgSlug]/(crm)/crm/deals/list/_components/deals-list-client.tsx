'use client'

import { useState } from 'react'
import { TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { DealsToolbar } from './deals-toolbar'
import { DealsDataTable } from './deals-data-table'
import { DealsPagination } from './deals-pagination'
import { DealsEmptyState } from './deals-empty-state'
import { type DealMemberOption } from '../../_components/deal-dialog-content'
import { useDealListFilters } from '../_lib/use-deal-list-filters'
import { deleteDeal } from '@/_actions/deal/delete-deal'
import { bulkDeleteDeals } from '@/_actions/deal/bulk-delete-deals'
import type { DealListDto } from '@/_data-access/deal/get-deals'
import type {
  StageDto,
  PipelineWithStagesDto,
} from '@/_data-access/pipeline/get-user-pipeline'
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
  pipeline: PipelineWithStagesDto
  pipelines: OrgPipelineDto[]
  activePipelineId: string
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  withinQuota: boolean
  orgSlug: string
}

export function DealsListClient({
  deals,
  total,
  page,
  pageSize,
  totalPages,
  stages,
  pipeline,
  pipelines,
  activePipelineId,
  members,
  currentUserId,
  userRole,
  withinQuota,
  orgSlug,
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

  // Estado elevado do Dialog de deleção individual
  const [deletingDeal, setDeletingDeal] = useState<DealListDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado elevado do Dialog de deleção em massa
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  // Hooks de action no orquestrador (deleção individual + em massa)
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
  const hasAnyUrlFilter =
    hasActiveFilters || !!search || !!assignedTo || !!pipelineId

  // Empty state premium: total zero E sem nenhum filtro ativo
  const showEmptyState = total === 0 && !hasAnyUrlFilter

  // Converte AcceptedMemberDto para o shape simples exigido pelo DealDialogContent
  const dealMembers: DealMemberOption[] = members
    .filter(
      (member): member is typeof member & { userId: string } =>
        member.userId !== null && !!member.user?.fullName,
    )
    .map((member) => ({ userId: member.userId, name: member.user!.fullName! }))

  return (
    <>
      <div className="flex flex-col gap-4">
        <DealsToolbar
          members={members}
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
        />

        {showEmptyState ? (
          <DealsEmptyState
            stages={stages}
            members={dealMembers}
            withinQuota={withinQuota}
          />
        ) : (
          <>
            <DealsDataTable
              deals={deals}
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
          </>
        )}
      </div>

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
