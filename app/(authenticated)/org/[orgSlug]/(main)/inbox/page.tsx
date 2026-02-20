import { Inbox } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'

const InboxPage = () => {
  return (
    <>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Inbox</HeaderTitle>
          <HeaderSubTitle>
            Gerencie todas as suas conversas em um só lugar.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Inbox className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Em breve</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de Inbox está sendo desenvolvido. Em breve você poderá
            gerenciar todas as suas conversas diretamente pelo Kronos.
          </p>
        </div>
      </div>
    </>
  )
}

export default InboxPage
