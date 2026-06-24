import { Plus } from 'lucide-react'
import type { BroadcastStatus } from '@prisma/client'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getBroadcasts } from '@/_data-access/broadcast/get-broadcasts'
import { getEligibleInboxes } from '@/_data-access/broadcast/get-eligible-inboxes'
import { getSegments } from '@/_data-access/segment/get-segments'
import { BroadcastsListClient } from './_components/broadcasts-list-client'
import { BroadcastsToolbar } from './_components/broadcasts-toolbar'
import { BroadcastsPagination } from './_components/broadcasts-pagination'
import { CreateBroadcastSheet } from './_components/create-broadcast-sheet'

const PAGE_SIZE = 20

const VALID_STATUSES = new Set<BroadcastStatus>([
  'DRAFT',
  'SCHEDULED',
  'RUNNING',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
])

const parseStatus = (value?: string): BroadcastStatus | undefined =>
  value && VALID_STATUSES.has(value as BroadcastStatus)
    ? (value as BroadcastStatus)
    : undefined

interface BroadcastsPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ page?: string; status?: string; q?: string }>
}

const BroadcastsPage = async ({
  params,
  searchParams,
}: BroadcastsPageProps) => {
  const { orgSlug } = await params
  const { page: pageParam, status: statusParam, q } = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const page = Math.max(1, Number(pageParam) || 1)
  const status = parseStatus(statusParam)
  const search = q ?? ''

  const [broadcasts, inboxes, segments] = await Promise.all([
    getBroadcasts(ctx, { page, pageSize: PAGE_SIZE, status, search }),
    getEligibleInboxes(ctx),
    getSegments(ctx),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Disparos</HeaderTitle>
          <HeaderSubTitle>
            Envie mensagens em massa para segmentos de contatos via WhatsApp.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateBroadcastSheet
            inboxes={inboxes}
            segments={segments}
            trigger={
              <Button>
                <Plus className="size-4" />
                Criar disparo
              </Button>
            }
          />
        </HeaderRight>
      </Header>

      <BroadcastsToolbar search={search} status={status} />
      <BroadcastsListClient broadcasts={broadcasts.data} orgSlug={orgSlug} />
      <BroadcastsPagination
        page={broadcasts.page}
        totalPages={broadcasts.totalPages}
      />
    </div>
  )
}

export default BroadcastsPage
