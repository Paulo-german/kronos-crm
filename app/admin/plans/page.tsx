import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminPlans } from '@/_data-access/admin/get-admin-plans'
import { getAdminModules } from '@/_data-access/admin/get-admin-modules'
import { getAdminFeatures } from '@/_data-access/admin/get-admin-features'
import { PlansTab } from './_components/plans-tab'
import { ModulesTab } from './_components/modules-tab'
import { FeaturesTab } from './_components/features-tab'

const PlansPage = async () => {
  const [plans, modules, features] = await Promise.all([
    getAdminPlans(),
    getAdminModules(),
    getAdminFeatures(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Planos & Limites</HeaderTitle>
          <HeaderSubTitle>Gerencie planos, módulos e features da plataforma</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <Tabs defaultValue="plans">
        <TabsList className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50">
          <TabsTrigger
            value="plans"
            className="rounded-md py-2"
          >
            Planos
          </TabsTrigger>
          <TabsTrigger
            value="modules"
            className="rounded-md py-2"
          >
            Módulos
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="rounded-md py-2"
          >
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <PlansTab plans={plans} />
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <ModulesTab modules={modules} />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <FeaturesTab features={features} modules={modules} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PlansPage
