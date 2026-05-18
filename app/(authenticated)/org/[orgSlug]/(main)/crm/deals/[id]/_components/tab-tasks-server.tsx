import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import TabTasks from './tab-tasks'

interface TabTasksServerProps {
  deal: DealDetailsDto
}

const TabTasksServer = async ({ deal }: TabTasksServerProps) => {
  return <TabTasks deal={deal} />
}

export default TabTasksServer
