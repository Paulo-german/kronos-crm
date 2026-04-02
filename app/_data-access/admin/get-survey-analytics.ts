import 'server-only'
import { db } from '@/_lib/prisma'
import type { SurveyAnalyticsDto, SurveyDistributionItem } from './types'
import {
  ROLE_LABELS,
  TEAM_SIZE_LABELS,
  CRM_EXPERIENCE_LABELS,
  MAIN_CHALLENGE_LABELS,
  REFERRAL_SOURCE_LABELS,
} from '@/_components/welcome-survey/survey-labels'

// Sem cache — painel admin deve exibir dados sempre frescos (regra MODULE_RULES admin 4.1)

/**
 * Agrega distribuição de um campo em frequência relativa.
 * Retorna itens ordenados do mais frequente para o menos frequente.
 */
const buildDistribution = (
  values: string[],
  labels: Record<string, string>,
): SurveyDistributionItem[] => {
  const total = values.length

  if (total === 0) return []

  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .map(([value, count]) => ({
      value,
      label: labels[value] ?? value,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}

export async function getSurveyAnalytics(): Promise<SurveyAnalyticsDto> {
  const profiles = await db.userProfile.findMany({
    where: { profileCompletedAt: { not: null } },
    select: {
      role: true,
      teamSize: true,
      crmExperience: true,
      mainChallenge: true,
      referralSource: true,
    },
  })

  const totalResponses = profiles.length

  return {
    totalResponses,
    byRole: buildDistribution(
      profiles.map((profile) => profile.role),
      ROLE_LABELS,
    ),
    byTeamSize: buildDistribution(
      profiles.map((profile) => profile.teamSize),
      TEAM_SIZE_LABELS,
    ),
    byCrmExperience: buildDistribution(
      profiles.map((profile) => profile.crmExperience),
      CRM_EXPERIENCE_LABELS,
    ),
    byMainChallenge: buildDistribution(
      profiles.map((profile) => profile.mainChallenge),
      MAIN_CHALLENGE_LABELS,
    ),
    byReferralSource: buildDistribution(
      profiles.map((profile) => profile.referralSource),
      REFERRAL_SOURCE_LABELS,
    ),
  }
}
