export interface AdminStatsDto {
  totalOrganizations: number
  totalUsers: number
  activeSubscriptions: number
  totalAnnouncements: number
}

export interface AdminOrganizationDto {
  id: string
  name: string
  slug: string
  memberCount: number
  subscription: {
    status: string
    planName: string
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  } | null
  trialEndsAt: Date | null
  createdAt: Date
}

export interface AdminPlanDto {
  id: string
  slug: string
  name: string
  stripeProductId: string | null
  description: string | null
  isActive: boolean
  activeSubscriptions: number
  grantedOrganizations: number
  modules: {
    slug: string
    name: string
  }[]
  limits: {
    featureKey: string
    featureName: string
    featureType: string
    valueType: string
    valueNumber: number | null
    valueBoolean: boolean | null
    valueString: string | null
  }[]
}

export interface AdminModuleDto {
  id: string
  slug: string
  name: string
  isActive: boolean
  featureCount: number
}

export interface AdminFeatureDto {
  id: string
  key: string
  name: string
  type: string
  valueType: string
  module: { slug: string; name: string } | null
  planLimitCount: number
}

export interface AdminPlanDetailDto {
  id: string
  slug: string
  name: string
  stripeProductId: string | null
  description: string | null
  isActive: boolean
  moduleIds: string[]
  limits: {
    featureKey: string
    valueNumber: number | null
  }[]
}

export interface AdminUserDto {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  phone: string | null
  isSuperAdmin: boolean
  createdAt: Date
  updatedAt: Date
  organizations: {
    name: string
    slug: string
    role: string
  }[]
}

export interface UserProfileDto {
  id: string
  role: string
  teamSize: string
  crmExperience: string
  mainChallenge: string
  referralSource: string
  profileCompletedAt: Date | null
  user: {
    fullName: string | null
    email: string
  }
  organization: {
    name: string
    slug: string
  }
}

export interface SurveyDistributionItem {
  value: string
  label: string
  count: number
  percentage: number
}

export interface SurveyAnalyticsDto {
  totalResponses: number
  byRole: SurveyDistributionItem[]
  byTeamSize: SurveyDistributionItem[]
  byCrmExperience: SurveyDistributionItem[]
  byMainChallenge: SurveyDistributionItem[]
  byReferralSource: SurveyDistributionItem[]
}
