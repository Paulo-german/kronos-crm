import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'

interface CustomFieldsLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

// Apenas a tab "Contatos" está disponível no MVP; deal/company ficam desabilitadas.
const ACTIVE_TAB = 'contact'

const CustomFieldsLayout = async ({
  children,
  params,
}: CustomFieldsLayoutProps) => {
  const { orgSlug } = await params

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Campos Personalizados</h1>
          <p className="text-muted-foreground">
            Crie campos adicionais para enriquecer as informações dos seus registros.
          </p>
        </div>

        <Tabs value={ACTIVE_TAB} className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50 bg-tab/30">
            <TabsTrigger
              value="contact"
              className="data-[state=active]:bg-card/80 rounded-md py-2"
              asChild
            >
              <Link href={`/org/${orgSlug}/settings/custom-fields/contact`}>
                Contatos
              </Link>
            </TabsTrigger>
            <TabsTrigger
              value="deal"
              className="data-[state=active]:bg-card/80 rounded-md py-2"
              disabled
            >
              Negociações
              <Badge variant="secondary" className="ml-2 text-xs">Em breve</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="data-[state=active]:bg-card/80 rounded-md py-2"
              disabled
            >
              Empresas
              <Badge variant="secondary" className="ml-2 text-xs">Em breve</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {children}
      </div>
    </div>
  )
}

export default CustomFieldsLayout
