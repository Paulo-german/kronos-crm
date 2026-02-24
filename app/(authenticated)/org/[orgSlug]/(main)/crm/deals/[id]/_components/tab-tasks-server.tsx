import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import TabTasks from './tab-tasks'

interface TabTasksServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
}

const TabTasksServer = async ({ deal, ctx }: TabTasksServerProps) => {
  const dealOptions = await getDealsOptions(ctx)

  return <TabTasks deal={deal} dealOptions={dealOptions} />
}

export default TabTasksServer
