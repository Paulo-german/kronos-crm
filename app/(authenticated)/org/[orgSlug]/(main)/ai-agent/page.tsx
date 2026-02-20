import { Bot } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'

const AiAgentPage = () => {
  return (
    <>
      <Header>
        <HeaderLeft>
          <HeaderTitle>AI Agent</HeaderTitle>
          <HeaderSubTitle>
            Automatize tarefas e obtenha insights com inteligência artificial.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Em breve</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            O módulo de AI Agent está sendo desenvolvido. Em breve você poderá
            usar inteligência artificial para automatizar processos e obter
            insights sobre seus dados.
          </p>
        </div>
      </div>
    </>
  )
}

export default AiAgentPage
