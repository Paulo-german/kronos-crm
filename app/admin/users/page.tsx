import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminUsers } from '@/_data-access/admin/get-admin-users'
import { UsersTable } from './_components/users-table'

const UsersPage = async () => {
  const users = await getAdminUsers()

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Usuários</HeaderTitle>
          <HeaderSubTitle>Todos os usuários cadastrados na plataforma</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <UsersTable users={users} />
    </div>
  )
}

export default UsersPage
