import Header, { HeaderLeft, HeaderTitle } from '@/_components/header'

interface HomeGreetingProps {
  firstName: string
}

const HomeGreeting = ({ firstName }: HomeGreetingProps) => {
  return (
    <Header>
      <HeaderLeft>
        <HeaderTitle>Olá, {firstName}!</HeaderTitle>
      </HeaderLeft>
    </Header>
  )
}

export default HomeGreeting
