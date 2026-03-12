export function pickDefined<
  T extends Record<string, unknown>,
  K extends keyof T,
>(source: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {}
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
}

export const OPTIONAL_AGENT_FIELDS = [
  'modelId',
  'debounceSeconds',
  'pipelineIds',
  'isActive',
  'businessHoursEnabled',
  'businessHoursTimezone',
  'businessHoursConfig',
  'outOfHoursMessage',
] as const
