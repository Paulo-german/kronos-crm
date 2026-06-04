import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getContacts } from '@/_data-access/contact/get-contacts'
import ContactWidget from './contact-widget'

interface ContactWidgetServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
}

const ContactWidgetServer = async ({ deal, ctx }: ContactWidgetServerProps) => {
  const contacts = await getContacts(ctx)

  // PII restrito quando a org ativou o toggle e o usuário é MEMBER
  const isPiiRestricted = ctx.userRole === 'MEMBER' && (ctx.hidePiiFromMembers ?? false)

  return <ContactWidget deal={deal} contacts={contacts} isPiiRestricted={isPiiRestricted} />
}

export default ContactWidgetServer
