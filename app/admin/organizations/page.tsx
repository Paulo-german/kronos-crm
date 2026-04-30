import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminOrganizations } from '@/_data-access/admin/get-admin-organizations'
import { getAdminPlansList } from '@/_data-access/admin/get-admin-plans-list'
import { OrganizationsTable } from './_components/organizations-table'

const OrganizationsPage = async () => {
  const [organizations, plans] = await Promise.all([
    getAdminOrganizations(),
    getAdminPlansList(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Organizações</HeaderTitle>
          <HeaderSubTitle>Todas as organizações cadastradas na plataforma</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <OrganizationsTable organizations={organizations} plans={plans} />
    </div>
  )
}

export default OrganizationsPage
