import { z } from 'zod'

export const ROLE_OPTIONS = [
  'ceo_founder',
  'sales_director',
  'sales_manager',
  'salesperson',
  'marketing',
  'other',
] as const

export const TEAM_SIZE_OPTIONS = [
  'solo',
  '2_5',
  '6_15',
  '16_50',
  '50_plus',
] as const

export const CRM_EXPERIENCE_OPTIONS = [
  'never_used',
  'spreadsheet',
  'used_other_crm',
] as const

export const MAIN_CHALLENGE_OPTIONS = [
  'organize_contacts',
  'track_deals',
  'manage_team',
  'automate_processes',
] as const

export const REFERRAL_SOURCE_OPTIONS = [
  'google',
  'referral',
  'social_media',
  'other',
] as const

export const submitWelcomeSurveySchema = z.object({
  role: z.enum(ROLE_OPTIONS),
  teamSize: z.enum(TEAM_SIZE_OPTIONS),
  crmExperience: z.enum(CRM_EXPERIENCE_OPTIONS),
  mainChallenge: z.enum(MAIN_CHALLENGE_OPTIONS),
  referralSource: z.enum(REFERRAL_SOURCE_OPTIONS),
})

export type SubmitWelcomeSurveyInput = z.infer<typeof submitWelcomeSurveySchema>
