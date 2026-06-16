import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

interface DealsPageProps {
  params: Promise<{ orgSlug: string }>
}

// Kanban (pipeline) é a visão padrão no desktop, mas inviável no mobile (board
// horizontal com drag). No mobile entramos direto na listagem paginada.
const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPod|IEMobile|BlackBerry/i

const DealsPage = async ({ params }: DealsPageProps) => {
  const { orgSlug } = await params
  const userAgent = (await headers()).get('user-agent') ?? ''
  const isMobile = MOBILE_UA_REGEX.test(userAgent)

  redirect(`/org/${orgSlug}/crm/deals/${isMobile ? 'list' : 'pipeline'}`)
}

export default DealsPage
