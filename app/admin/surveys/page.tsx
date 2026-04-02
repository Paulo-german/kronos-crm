import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getSurveyAnalytics } from '@/_data-access/admin/get-survey-analytics'
import { getUserProfileResponses } from '@/_data-access/admin/get-user-profile-responses'
import { SurveyAnalyticsDashboard } from './_components/survey-analytics-dashboard'

const SurveysPage = async () => {
  const [analytics, responses] = await Promise.all([
    getSurveyAnalytics(),
    getUserProfileResponses(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Welcome Survey</HeaderTitle>
          <HeaderSubTitle>Respostas do questionário de boas-vindas</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <SurveyAnalyticsDashboard analytics={analytics} responses={responses} />
    </div>
  )
}

export default SurveysPage
