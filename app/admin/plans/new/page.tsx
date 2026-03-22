import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminModules } from '@/_data-access/admin/get-admin-modules'
import { getAdminFeatures } from '@/_data-access/admin/get-admin-features'
import { PlanForm } from '../_components/plan-form'

const NewPlanPage = async () => {
  const [modules, features] = await Promise.all([getAdminModules(), getAdminFeatures()])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/plans">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Novo Plano</HeaderTitle>
          <HeaderSubTitle>
            Configure o plano, selecione módulos e defina os limites de cada feature.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <PlanForm modules={modules} features={features} />
    </div>
  )
}

export default NewPlanPage
