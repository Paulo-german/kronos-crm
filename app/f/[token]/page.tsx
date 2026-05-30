import { getCaptureFormByToken } from '@/_data-access/capture-form/get-capture-form-by-token'
import { CaptureFormRenderer } from './_components/capture-form-renderer'
import { CaptureFormUnavailable } from './_components/capture-form-unavailable'

interface FormPageProps {
  params: Promise<{ token: string }>
}

const FormPage = async ({ params }: FormPageProps) => {
  const { token } = await params
  const form = await getCaptureFormByToken(token)

  if (!form || !form.isActive || form.organizationIsReadOnly) {
    return <CaptureFormUnavailable />
  }

  return <CaptureFormRenderer form={form} publicToken={token} />
}

export default FormPage
