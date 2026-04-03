import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { TutorialsHub } from './_components/tutorials-hub'

interface TutorialsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function TutorialsPage({ params }: TutorialsPageProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const completedTutorialIds = await getTutorialCompletions(
    ctx.userId,
    ctx.orgId,
  )

  return (
    <>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Tutoriais</HeaderTitle>
          <HeaderSubTitle>
            Aprenda a usar o Kronos com guias interativos
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="mt-6">
        <TutorialsHub completedTutorialIds={completedTutorialIds} />
      </div>
    </>
  )
}
