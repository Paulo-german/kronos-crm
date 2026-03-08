import type { UseFormReturn } from 'react-hook-form'
import type { GeneralTabFormValues } from '../general-tab'

export interface SectionProps {
  form: UseFormReturn<GeneralTabFormValues>
  canManage: boolean
}
