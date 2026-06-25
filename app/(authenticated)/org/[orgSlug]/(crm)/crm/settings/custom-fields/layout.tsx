import { BackButton } from '@/_components/layout/back-button'
import { CustomFieldsTabs } from './_components/custom-fields-tabs'

interface CustomFieldsLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const CustomFieldsLayout = async ({
  children,
  params,
}: CustomFieldsLayoutProps) => {
  const { orgSlug } = await params

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="space-y-6">
        <BackButton href={`/org/${orgSlug}/crm/settings`} />

        <div>
          <h1 className="text-2xl font-bold">Campos Personalizados</h1>
          <p className="text-muted-foreground">
            Crie campos adicionais para enriquecer as informações dos seus
            registros.
          </p>
        </div>

        <CustomFieldsTabs orgSlug={orgSlug} />

        {children}
      </div>
    </div>
  )
}

export default CustomFieldsLayout
