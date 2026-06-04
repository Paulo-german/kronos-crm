import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { TutorialsHub } from '@/(authenticated)/org/[orgSlug]/(platform)/tutorials/_components/tutorials-hub'

interface TutorialsPageProps {
  params: Promise<{ orgSlug: string }>
}

const TutorialsPage = async ({ params }: TutorialsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const completedTutorialIds = await getTutorialCompletions(ctx.userId, ctx.orgId)

  return (
    <>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Tutoriais</HeaderTitle>
          <HeaderSubTitle>Aprenda a usar o Kronos com guias interativos</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="mt-6">
        <TutorialsHub completedTutorialIds={completedTutorialIds} />
      </div>
    </>
  )
}

export default TutorialsPage
