import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { getDealTasks } from '@/_data-access/deal/get-deal-tasks'
import type { RBACContext } from '@/_lib/rbac'
import TabTasks from './tab-tasks'

interface TabTasksServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
}

const TabTasksServer = async ({ deal, ctx }: TabTasksServerProps) => {
  const tasks = await getDealTasks(deal.id, ctx)
  return <TabTasks deal={deal} tasks={tasks} />
}

export default TabTasksServer
