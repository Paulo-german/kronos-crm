import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getCompanies } from '@/_data-access/company/get-companies'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { ImportClient } from './_components/import-client'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Alert, AlertDescription, AlertTitle } from '@/_components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'

interface ImportPageProps {
  params: Promise<{ orgSlug: string }>
}

const ImportPage = async ({ params }: ImportPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [companies, quota] = await Promise.all([
    getCompanies(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'contact'),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Importar Contatos</HeaderTitle>
          <HeaderSubTitle>
            Importe contatos a partir de uma planilha CSV ou Excel
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      {!quota.withinQuota ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite do plano atingido</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            <span>
              Você atingiu o limite de {quota.limit} contatos do seu plano.
              Faça upgrade para importar mais contatos.
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${orgSlug}/settings/billing`}>
                Ver planos
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <ImportClient
          companies={companies}
          quotaCurrent={quota.current}
          quotaLimit={quota.limit}
        />
      )}
    </div>
  )
}

export default ImportPage
