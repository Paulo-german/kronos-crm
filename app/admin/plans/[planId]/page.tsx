import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getPlanById } from '@/_data-access/admin/get-plan-by-id'
import { getAdminModules } from '@/_data-access/admin/get-admin-modules'
import { getAdminFeatures } from '@/_data-access/admin/get-admin-features'
import { PlanForm } from '../_components/plan-form'

interface EditPlanPageProps {
  params: Promise<{ planId: string }>
}

const EditPlanPage = async ({ params }: EditPlanPageProps) => {
  const { planId } = await params

  const [plan, modules, features] = await Promise.all([
    getPlanById(planId),
    getAdminModules(),
    getAdminFeatures(),
  ])

  if (!plan) {
    redirect('/admin/plans')
  }

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
          <HeaderTitle>Editar {plan.name}</HeaderTitle>
          <HeaderSubTitle>
            Ajuste as configurações, módulos e limites deste plano.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <PlanForm plan={plan} modules={modules} features={features} />
    </div>
  )
}

export default EditPlanPage
