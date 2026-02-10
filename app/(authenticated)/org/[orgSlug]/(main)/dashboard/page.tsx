import Header, {
  HeaderLeft,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'

const DashboardPage = () => {
  return (
    <div className="space-y-4">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Dashboard</HeaderTitle>
          <HeaderSubTitle>Bem-vindo ao Kronos CRM</HeaderSubTitle>
        </HeaderLeft>
      </Header>
    </div>
  )
}

export default DashboardPage
