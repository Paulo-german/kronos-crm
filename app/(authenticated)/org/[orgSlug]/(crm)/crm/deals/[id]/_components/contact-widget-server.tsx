import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { RBACContext } from '@/_lib/rbac/types'
import { getCompanies } from '@/_data-access/company/get-companies'
import ContactWidget from './contact-widget'
import CompanyWidget from './company-widget'

interface ContactWidgetServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
}

const ContactWidgetServer = async ({ deal, ctx }: ContactWidgetServerProps) => {
  const companies = await getCompanies(ctx.orgId)

  // PII restrito quando a org ativou o toggle e o usuário é MEMBER
  const isPiiRestricted =
    ctx.userRole === 'MEMBER' && (ctx.hidePiiFromMembers ?? false)

  return (
    <div className="space-y-4">
      <ContactWidget deal={deal} isPiiRestricted={isPiiRestricted} />
      <CompanyWidget deal={deal} companies={companies} />
    </div>
  )
}

export default ContactWidgetServer
