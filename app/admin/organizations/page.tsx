import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminOrganizations } from '@/_data-access/admin/get-admin-organizations'
import { OrganizationsTable } from './_components/organizations-table'

const OrganizationsPage = async () => {
  const organizations = await getAdminOrganizations()

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Organizações</HeaderTitle>
          <HeaderSubTitle>Todas as organizações cadastradas na plataforma</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <OrganizationsTable organizations={organizations} />
    </div>
  )
}

export default OrganizationsPage
